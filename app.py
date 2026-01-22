from flask import Flask, render_template, session, redirect, url_for, request, abort,jsonify, g
from flask_bcrypt import Bcrypt
from jinja2 import TemplateNotFound
import sqlite3
import os
from functools import wraps
import datetime
import re # Import regex for basic username validation

# -----------------------------------------------------------------------------------------------------------
# APP & SECURITY INITIALIZATION
# -----------------------------------------------------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(
    __name__,
    static_url_path='/static',
    static_folder=os.path.join(BASE_DIR, 'static')
)
# IMPORTANT: In a production environment, this should be set via environment variables.
app.secret_key = "your_strong_and_unique_secret_key_here" 
bcrypt = Bcrypt(app)
DATABASE_PATH = 'database.db' # Define the database path

# -----------------------------------------------------------------------------------------------------------
# DATABASE HELPER FUNCTIONS
# -----------------------------------------------------------------------------------------------------------

def get_db_connection():
    """
    Establishes a connection to the SQLite database.
    Added 'timeout=10' to prevent instant lock errors.
    """
    # FIX 1: Added timeout to handle concurrent access gracefully
    conn = sqlite3.connect(DATABASE_PATH, timeout=10) 
    conn.row_factory = sqlite3.Row  # This allows accessing columns by name
    return conn

def log_action(username, action):
    """
    Inserts an action log into the 'logs' table.
    Uses 'with' statement to guarantee connection closure, fixing potential locks.
    """
    # FIX 2: Use 'with' statement for connection management
    try:
        with get_db_connection() as conn:
            c = conn.cursor()
            
            # Safely retrieve the IP address from the request context.
            try:
                ip_address = request.remote_addr
            except RuntimeError:
                ip_address = 'N/A (Server Context)'
            
            # Ensure username is not empty if it's not the 'Unknown' placeholder
            username = username if username and username.strip() else 'Anonymous/Empty'
            
            c.execute("INSERT INTO logs (username, action, ip_address) VALUES (?, ?, ?)", 
                      (username, action, ip_address))
            conn.commit()
    # Handle potential lock or other DB errors here
    except sqlite3.OperationalError as e:
        print(f"Database Lock Error in log_action: {e}")
    except Exception as e:
        print(f"Error in log_action: {e}")


# -----------------------------------------------------------------------------------------------------------
# ROLE-BASED ACCESS CONTROL (RBAC) DECORATOR
# -----------------------------------------------------------------------------------------------------------

def role_required(role):
    """
    Decorator to restrict access to a route based on the user's session role.
    Usage: @role_required('admin') or @role_required('user')
    """
    def wrapper(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            current_role = session.get('role')
            if not current_role:
                # User not logged in
                return redirect(url_for('index', error="You must log in to access this page."))
            if current_role != role:
                # User is logged in but does not have the required role
                log_action(session.get('username', 'Unauthorized'), f"Attempted access to {role} page.")
                abort(403) # Forbidden
            return f(*args, **kwargs)
        return decorated_function
    return wrapper

# -----------------------------------------------------------------------------------------------------------
# AUTHENTICATION ROUTES
# -----------------------------------------------------------------------------------------------------------

@app.route('/')
def index():
    """Main homepage route."""
    role = session.get('role')
    username = session.get('username')  # <-- get username from session
    return render_template('index.html', role=role, username=username, error=request.args.get('error'))


@app.route('/login', methods=['POST'])
def login():
    """Handles user login submission and authentication against the DB."""
    username = request.form.get('username', '') 
    password = request.form.get('password')

    if not username or not password:
        log_action('Anonymous/Empty', "Login attempted with missing credentials.")
        return redirect(url_for('index', error="Please enter both username and password."))
        
    # FIX 3: Use 'with' statement for database read operation
    with get_db_connection() as conn:
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    # conn is automatically closed here

    if user:
        if bcrypt.check_password_hash(user['password'], password):
            # Successful login
            session.clear() 
            session['username'] = user['username']
            session['user_id'] = user['id']  # <-- ADD THIS
            session['role'] = user['role']
            session['from_home'] = True 

            log_action(user['username'], f"Successful login as {user['role']}")

            if user['role'] == 'admin':
                return redirect(url_for('admin_dashboard'))
            else:
                return redirect(url_for('index'))
        else:
            # Failed login attempt - Password incorrect
            log_action(username, "Failed login attempt (Incorrect password)")
            return redirect(url_for('index', error="Invalid username or password. Try again!"))
    else:
        # Failed login attempt - Username not found
        log_action(username, "Failed login attempt (Username not found)")
        return redirect(url_for('index', error="Invalid username or password. Try again!"))


@app.route('/register', methods=['POST'])
def register():
    """Handles new user registration submission."""
    username = request.form.get('reg_username', '').strip()
    password = request.form.get('reg_password')
    password_confirm = request.form.get('reg_password_confirm')
    role = request.form.get('role', 'user')  # Default to 'user'

    # 1. Basic Validation
    if not username or not password or not password_confirm:
        log_action('Anonymous/Empty', "Registration attempted with missing fields.")
        return redirect(url_for('index', error="Registration failed: All fields are required."))

    if password != password_confirm:
        log_action(username, "Registration failed: Passwords do not match.")
        return redirect(url_for('index', error="Registration failed: Passwords do not match."))

    if len(username) < 3 or not re.match(r'^[A-Za-z0-9]+$', username):
        log_action(username, "Registration failed: Invalid username format.")
        return redirect(url_for('index', error="Registration failed: Username must be 3+ letters/numbers."))

    # 2. Check for Existing User
    with get_db_connection() as conn:
        existing_user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    
    if existing_user:
        log_action(username, "Registration failed: Username already exists.")
        return redirect(url_for('index', error=f"Registration failed: Username '{username}' is already taken."))

    # 3. Hash Password and Insert
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                (username, hashed_password, role)
            )
            conn.commit()

            # Fetch the new user's ID immediately
            new_user = cursor.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone()
            user_id = new_user['id'] if new_user else None

        if not user_id:
            log_action(username, "Registration failed: Could not retrieve new user ID.")
            return redirect(url_for('index', error="Registration failed: Unknown database error."))

        # 4. Successful Registration & Auto-Login
        session.clear()
        session['username'] = username
        session['role'] = role
        session['user_id'] = user_id  # <-- Crucial fix for game API
        session['from_home'] = True

        log_action(username, "Successful registration.")

        return redirect(url_for('index', success=f"Welcome, {username}! You are now logged in."))

    except sqlite3.IntegrityError:
        log_action(username, "Registration failed: Database integrity error.")
        return redirect(url_for('index', error="Registration failed: Database error occurred."))
    except Exception as e:
        log_action(username, f"Registration failed: {str(e)}")
        return redirect(url_for('index', error="Registration failed: Unknown error occurred."))



@app.route('/logout')
def logout():
    """Clears all session info."""
    username = session.get('username', 'Unknown')
    # This log_action call was the initial source of your lock error
    log_action(username, "Logged out") 
    
    session.clear()
    return redirect(url_for('index'))

# -----------------------------------------------------------------------------------------------------------
# CORE APPLICATION ROUTES
# -----------------------------------------------------------------------------------------------------------

@app.route('/play')
def play():
    """Play section (anime-themed interactive area). Requires login."""
    if not session.get('username'):
        return redirect(url_for('index', error="You must be logged in to access the Play area."))

    return render_template('play.html', role=session.get('role'), username=session.get('username'))


# -----------------------------------------------------------------------------------------------------------
# NEW INTERACTIVE RECIPE ROUTE
# -----------------------------------------------------------------------------------------------------------


# @app.route('/sample_quest')                       # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
# def sample_quest():                               # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
#     """
#     UNIVERSAL RECIPE QUEST ROUTE.
#     Automatically loads the HTML template & JSON script for the recipe.
#     """
#     return render_template(
#         "sample.html",                                # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
#         role=session.get('role'),
#         username=session.get('username')
#     )
@app.route('/momo_quest')
def momo_quest():
    """
    NEW ROUTE: Serves the interactive, game-style momo recipe page.
    This page uses nami_momo.html, nami_momo.css, and nami_momo.js.
    """
    return render_template(
        'nami_momo.html', 
        role=session.get('role'), 
        username=session.get('username')
    )

@app.route('/wedges_quest')                       # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
def wedges_quest():                               # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
    """
    UNIVERSAL RECIPE QUEST ROUTE.
    Automatically loads the HTML template & JSON script for the recipe.
    """
    return render_template(
        "wedges.html",                                # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
        role=session.get('role'),
        username=session.get('username')
    )


@app.route('/paneer_tikka_quest')                       # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
def paneer_tikka_quest():                               # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
    """
    UNIVERSAL RECIPE QUEST ROUTE.
    Automatically loads the HTML template & JSON script for the recipe.
    """
    return render_template(
        "chopper_pt.html",                                # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
        role=session.get('role'),
        username=session.get('username')
    )

@app.route('/cassata_quest')                       # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
def cassata_quest():                               # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
    """
    UNIVERSAL RECIPE QUEST ROUTE.
    Automatically loads the HTML template & JSON script for the recipe.
    """
    return render_template(
        "brook_cassata.html",                                # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
        role=session.get('role'),
        username=session.get('username')
    )   
    
    
@app.route('/chop_suey_quest')                       # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
def chop_suey_quest():                               # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
    """
    UNIVERSAL RECIPE QUEST ROUTE.
    Automatically loads the HTML template & JSON script for the recipe.
    """
    return render_template(
        "franky_suey.html",                                # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
        role=session.get('role'),
        username=session.get('username')
    )   
    
@app.route('/dora_cake_quest')                       # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
def dora_cake_quest():                               # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
    """
    UNIVERSAL RECIPE QUEST ROUTE.
    Automatically loads the HTML template & JSON script for the recipe.
    """
    return render_template(
        "jinbei_cake.html",                                # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
        role=session.get('role'),
        username=session.get('username')
    )     
    
@app.route('/amritsari_quest')                       # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
def amritsari_quest():                               # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
    """
    UNIVERSAL RECIPE QUEST ROUTE.
    Automatically loads the HTML template & JSON script for the recipe.
    """
    return render_template(
        "luffy_amritsari.html",                                # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
        role=session.get('role'),
        username=session.get('username')
    )       

@app.route('/frankie_quest')                       # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
def frankie_quest():                               # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
    """
    UNIVERSAL RECIPE QUEST ROUTE.
    Automatically loads the HTML template & JSON script for the recipe.
    """
    return render_template(
        "nami_frankie.html",                                # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
        role=session.get('role'),
        username=session.get('username')
    )
    
@app.route('/palak_paneer_quest')                       # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
def palak_paneer_quest():                               # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
    """
    UNIVERSAL RECIPE QUEST ROUTE.
    Automatically loads the HTML template & JSON script for the recipe.
    """
    return render_template(
        "robin_palak_paneer.html",                                # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
        role=session.get('role'),
        username=session.get('username')
    )   
    
@app.route('/butter_chicken_quest')                       # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
def butter_chicken_quest():                               # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
    """
    UNIVERSAL RECIPE QUEST ROUTE.
    Automatically loads the HTML template & JSON script for the recipe.
    """
    return render_template(
        "sanji_bc.html",                                # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
        role=session.get('role'),
        username=session.get('username')
    )
    
    
@app.route('/kolhapuri_quest')                       # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
def kolhapuri_quest():                               # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
    """
    UNIVERSAL RECIPE QUEST ROUTE.
    Automatically loads the HTML template & JSON script for the recipe.
    """
    return render_template(
        "zoro_kolhapuri.html",                                # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
        role=session.get('role'),
        username=session.get('username')
    )
    
@app.route('/cheese_balls_quest')                       # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
def cheese_balls_quest():                               # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
    """
    UNIVERSAL RECIPE QUEST ROUTE.
    Automatically loads the HTML template & JSON script for the recipe.
    """
    return render_template(
        "usopp_cheese_balls.html",                                # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
        role=session.get('role'),
        username=session.get('username')
    )
    
@app.route('/chicken_crispy_quest')                       # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
def chicken_crispy_quest():                               # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
    """
    UNIVERSAL RECIPE QUEST ROUTE.
    Automatically loads the HTML template & JSON script for the recipe.
    """
    return render_template(
        "sanji_chicken_crispy.html",                                # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
        role=session.get('role'),
        username=session.get('username')
    )  
    
@app.route('/chicken_tikka_quest')                       # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
def chicken_tikka_quest():                               # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
    """
    UNIVERSAL RECIPE QUEST ROUTE.
    Automatically loads the HTML template & JSON script for the recipe.
    """
    return render_template(
        "zoro_ct.html",                                # CHANGE HERE !!!!!!!!!!!!!!!!!!!!
        role=session.get('role'),
        username=session.get('username')
    )                                     
# -----------------------------------------------------------------------------------------------------------
# EXISTING RECIPE ROUTES
# -----------------------------------------------------------------------------------------------------------

@app.route('/cooking')
def cooking():
    """
    Cooking section – accessible to all (view recipes). 
    Fetches all recipes from the database.
    """
    # FIX 5: Use 'with' statement for database read operation
    with get_db_connection() as conn:
        recipes = conn.execute('SELECT * FROM recipes ORDER BY category, name').fetchall()
    # conn is automatically closed here
    
    return render_template('cooking.html', role=session.get('role'), username=session.get('username'), recipes=recipes,page_id='cooking')

# -----------------------------------------------------------------------------------------------------------
# RECIPE PAGE ROUTE
# -----------------------------------------------------------------------------------------------------------

@app.route('/recipe/<dish_id>')
def recipe(dish_id):
    """
    Serves individual dish pages by fetching data from the database.
    """
    # FIX 6: Use 'with' statement for database read operation
    with get_db_connection() as conn:
        dish = conn.execute('SELECT * FROM recipes WHERE dish_id = ?', (dish_id,)).fetchone()
    # conn is automatically closed here

    if dish is None:
        abort(404)
        
    dish_dict = dict(dish)

    try:
        # Check for a specific template name (e.g., 'momo_quest.html')
        # If the user is requesting 'momo_quest', this will fail, 
        # but that is now handled by the specific /momo_quest route.
        return render_template(f'{dish_id}.html', dish=dish_dict, role=session.get('role'), username=session.get('username'))
    except TemplateNotFound:
        # Default template if a specific one doesn't exist
        return render_template('recipe.html', dish=dish_dict, role=session.get('role'), username=session.get('username'))
    
    
# -----------------------------------------------------------------------------------------------------------
# CULTURE
# -----------------------------------------------------------------------------------------------------------   

@app.route('/culture')
def culture():
    role = session.get('role')  # or however you store it
    return render_template('culture.html',role=session.get('role'), username=session.get('username'))


# -----------------------------------------------------------------------------------------------------------
# MYSTERY
# -----------------------------------------------------------------------------------------------------------

@app.route("/mystery")
def mystery():
    return render_template(
        "mystery.html",
        role=session.get("role"),
        username=session.get("username")
    )

# -----------------------------------------------------------------------------------------------------------
# ADMIN-ONLY ROUTES (Management & Logging)
# -----------------------------------------------------------------------------------------------------------

@app.route('/admin')
@role_required('admin')
def admin_dashboard():
    """
    Admin Dashboard: shows list of recipes for editing and a log of recent activity.
    """
    # FIX 7: Use 'with' statement for multiple database read operations
    with get_db_connection() as conn:
        recipes = conn.execute('SELECT * FROM recipes ORDER BY name').fetchall()
        logs = conn.execute('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 50').fetchall()
        users = conn.execute('SELECT id, username, role FROM users ORDER BY role, username').fetchall()
    # conn is automatically closed here

    return render_template('admin_dashboard.html', role=session.get('role'), username=session.get('username'), recipes=recipes, logs=logs, users=users, error=request.args.get('error'))


@app.route('/admin/add', methods=['POST'])
@role_required('admin')
def admin_add_recipe():
    """Admin-only route to add new recipes to the DB."""
    name = request.form['name']
    ingredients = request.form['ingredients']
    steps = request.form['steps']
    
    dish_id = name.lower().replace(" ", "_").replace("’", "").replace("'", "")
    
    category = request.form.get('category', 'Unknown')
    subtype = request.form.get('subtype', 'Unknown')
    char_name = request.form.get('char_name', 'System')
    img_url = request.form.get('img_url', f'https://placehold.co/400x300/6A0572/white?text={dish_id}')
    char_img_url = request.form.get('char_img_url', 'https://placehold.co/100x100/A3005A/white?text=S')

    try:
        # FIX 8: Use 'with' statement for database write operation
        with get_db_connection() as conn:
            conn.execute(
                "INSERT INTO recipes (dish_id, name, ingredients, steps, category, subtype, char_name, img_url, char_img_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (dish_id, name, ingredients, steps, category, subtype, char_name, img_url, char_img_url)
            )
            conn.commit()
        
        log_action(session['username'], f"Added new recipe: {name}")
        return redirect(url_for('admin_dashboard'))
    except sqlite3.IntegrityError:
        return redirect(url_for('admin_dashboard', error=f"Recipe ID '{dish_id}' already exists."))


@app.route('/admin/edit/<int:recipe_id>', methods=['POST'])
@role_required('admin')
def admin_edit_recipe(recipe_id):
    """Admin-only route to edit an existing recipe in the DB."""
    name = request.form['name']
    ingredients = request.form['ingredients']
    steps = request.form['steps']
    
    category = request.form.get('category', 'Unknown')
    subtype = request.form.get('subtype', 'Unknown')
    char_name = request.form.get('char_name', 'System')
    img_url = request.form.get('img_url') 
    char_img_url = request.form.get('char_img_url')

    # FIX 9: Use 'with' statement for database write operation
    with get_db_connection() as conn:
        conn.execute(
            """
            UPDATE recipes SET 
                name = ?, ingredients = ?, steps = ?, category = ?, subtype = ?, 
                char_name = ?, img_url = ?, char_img_url = ?
            WHERE id = ?
            """,
            (name, ingredients, steps, category, subtype, char_name, img_url, char_img_url, recipe_id)
        )
        conn.commit()
    # conn is automatically closed here
    
    log_action(session['username'], f"Edited recipe ID {recipe_id}: {name}")
    return redirect(url_for('admin_dashboard'))


@app.route('/admin/delete/<int:recipe_id>', methods=['POST'])
@role_required('admin')
def admin_delete_recipe(recipe_id):
    """Admin-only route to delete a recipe from the DB."""
    
    # FIX 10: Use 'with' statement for database write operation
    with get_db_connection() as conn:
        
        recipe = conn.execute('SELECT name FROM recipes WHERE id = ?', (recipe_id,)).fetchone()
        recipe_name = recipe['name'] if recipe else f"ID {recipe_id}"

        conn.execute('DELETE FROM recipes WHERE id = ?', (recipe_id,))
        conn.commit()
    # conn is automatically closed here
    
    log_action(session['username'], f"Deleted recipe: {recipe_name}")
    return redirect(url_for('admin_dashboard'))

# -----------------------------------------------------------------------------------------------------------
# ADMIN: DELETE LOGS & USERS
# -----------------------------------------------------------------------------------------------------------

@app.route('/admin/delete_user/<int:user_id>', methods=['POST'])
@role_required('admin')
def admin_delete_user(user_id):
    """Delete a single user (except admin users)."""
    # FIX 11: Use 'with' statement for database read/write operation
    with get_db_connection() as conn:
        user = conn.execute('SELECT username, role FROM users WHERE id = ?', (user_id,)).fetchone()
        
        if not user:
            return redirect(url_for('admin_dashboard', error="User not found."))
        
        if user['role'] == 'admin':
            return redirect(url_for('admin_dashboard', error="Cannot delete admin users."))

        conn.execute('DELETE FROM users WHERE id = ?', (user_id,))
        conn.commit()
    # conn is automatically closed here
    
    log_action(session.get('username'), f"Deleted user: {user['username']}")
    return redirect(url_for('admin_dashboard'))


@app.route('/admin/delete_all_users', methods=['POST'])
@role_required('admin')
def admin_delete_all_users():
    """Delete all non-admin users."""
    # FIX 12: Use 'with' statement for database write operation
    with get_db_connection() as conn:
        conn.execute("DELETE FROM users WHERE role != 'admin'")
        conn.commit()
    # conn is automatically closed here
    
    log_action(session.get('username'), "Deleted all non-admin users")
    return redirect(url_for('admin_dashboard'))


@app.route('/admin/delete_all_logs', methods=['POST'])
@role_required('admin')
def admin_delete_all_logs():
    """Delete all activity logs (admin-only)."""
    # FIX 13: Use 'with' statement for database write operation
    with get_db_connection() as conn:
        conn.execute('DELETE FROM logs')
        conn.commit()
    # conn is automatically closed here
    
    log_action(session.get('username'), "Deleted all activity logs")
    return redirect(url_for('admin_dashboard'))


# -----------------------------------------------
# BOOKS / FAVORITES ROUTES
# -----------------------------------------------

@app.route('/books')
def books():
    """Show all admin-created recipes for users to browse."""
    if not session.get('username'):
        return redirect(url_for('index', error="Please login to access Books."))

    # FIX 14: Use 'with' statement for multiple database read operations
    with get_db_connection() as conn:
        # Fetch all recipes created by admin
        recipes = conn.execute('SELECT * FROM recipes ORDER BY category, name').fetchall()

        # Fetch user's favorites
        favorites = []
        user = conn.execute('SELECT id FROM users WHERE username = ?', (session['username'],)).fetchone()
        if user:
            fav_rows = conn.execute('SELECT recipe_id FROM favorites WHERE user_id = ?', (user['id'],)).fetchall()
            favorites = [row['recipe_id'] for row in fav_rows]

    # conn is automatically closed here
    return render_template('books.html', role=session.get('role'), username=session.get('username'),
                           recipes=recipes, favorites=favorites)


@app.route('/toggle_favorite/<int:recipe_id>', methods=['POST'])
def toggle_favorite(recipe_id):
    """
    Add or remove a recipe from user's favorites.
    Uses a single 'with' block for the entire transaction to prevent locks.
    """
    if not session.get('username'):
        return redirect(url_for('index', error="Please login to favorite recipes."))

    # FIX 15: Use 'with' statement for the entire database transaction
    with get_db_connection() as conn:
        user = conn.execute('SELECT id FROM users WHERE username = ?', (session['username'],)).fetchone()
        if not user:
            return redirect(url_for('index', error="User not found."))

        # Check if the recipe exists
        recipe = conn.execute('SELECT id FROM recipes WHERE id = ?', (recipe_id,)).fetchone()
        if not recipe:
            return redirect(url_for('books', error="Recipe not found."))

        # Check if already favorited
        exists = conn.execute(
            'SELECT id FROM favorites WHERE user_id = ? AND recipe_id = ?',
            (user['id'], recipe_id)
        ).fetchone()

        if exists:
            conn.execute('DELETE FROM favorites WHERE id = ?', (exists['id'],))
            log_action(session['username'], f"Removed recipe ID {recipe_id} from favorites")
        else:
            conn.execute('INSERT INTO favorites (user_id, recipe_id) VALUES (?, ?)', (user['id'], recipe_id))
            log_action(session['username'], f"Added recipe ID {recipe_id} to favorites")

        conn.commit()
    # conn is automatically closed here
    return redirect(url_for('books'))


# -----------------------------------------------
# FAVORITES PAGE ROUTE
# -----------------------------------------------

@app.route('/favorites')
def favorites():
    """Show all recipes that the logged-in user has marked as favorite."""
    if not session.get('username'):
        return redirect(url_for('index', error="Please login to view favorites."))

    # FIX 16: Use 'with' statement for database read operation
    with get_db_connection() as conn:
        
        # Get user ID
        user = conn.execute('SELECT id FROM users WHERE username = ?', (session['username'],)).fetchone()
        if not user:
            return redirect(url_for('index', error="User not found."))

        # Fetch favorited recipes
        fav_rows = conn.execute(
            """
            SELECT r.* FROM recipes r
            JOIN favorites f ON r.id = f.recipe_id
            JOIN users u ON f.user_id = u.id
            WHERE u.username = ?
            ORDER BY r.category, r.name
            """,
            (session['username'],)
        ).fetchall()
        
        favorites_list = [row['id'] for row in fav_rows]  # For heart icons
    # conn is automatically closed here

    return render_template(
        'favorites.html',
        role=session.get('role'),
        username=session.get('username'),
        recipes=fav_rows,
        favorites=favorites_list
    )
#----------------------
# DEBUG
#----------------------
# @app.before_request
# def debug_session():
#     print("Session contents:", dict(session))



# -----------------------------------------------------------------------------------------------------------
# MAIN
# -----------------------------------------------------------------------------------------------------------

if __name__ == '__main__':
    if not os.path.exists(DATABASE_PATH):
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        print(" CRITICAL ERROR: Database file (database.db) not found.")
        print(" You must run 'python init_db.py' at least once to create the database and user accounts.")
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    else:
        app.run(debug=True)

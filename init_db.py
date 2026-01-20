import sqlite3
from flask_bcrypt import Bcrypt

bcrypt = Bcrypt()
DB_NAME = "database.db"

def initialize_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # -------------------------------------------------
    # USERS TABLE (for login only)
    # -------------------------------------------------
    cursor.execute("DROP TABLE IF EXISTS users;")
    cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'user'))
        );
    """)

    admin_password = bcrypt.generate_password_hash("password").decode("utf-8")
    user_password = bcrypt.generate_password_hash("password").decode("utf-8")

    cursor.execute(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
        ("admin", admin_password, "admin")
    )
    cursor.execute(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
        ("user", user_password, "user")
    )

    # -------------------------------------------------
    # RECIPES TABLE
    # -------------------------------------------------
    cursor.execute("DROP TABLE IF EXISTS recipes;")
    cursor.execute("""
        CREATE TABLE recipes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dish_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            ingredients TEXT,
            steps TEXT,
            category TEXT,
            subtype TEXT,
            char_name TEXT,
            img_url TEXT,
            char_img_url TEXT
        );
    """)

    # Sample recipes (expand as needed)
    sample_recipes = [
        ("meat_feast", "Meat Lover's Feast", "Cured meats, seasoning, glaze", "Sear meat, braise 2 hours, glaze & serve", "Main Course", "Braise", "Sanji", "https://placehold.co/400x300/e9a04a/white?text=Meat+Feast", "https://placehold.co/100x100/A3005A/white?text=S"),
        ("chicken65", "Chicken65", "Chicken, spices, oil", "Marinate chicken, fry until crispy", "Main Course", "Fry", "Sanji", "https://placehold.co/400x300/e9a04a/white?text=Chicken65", "https://placehold.co/100x100/A3005A/white?text=C"),
        ("burger", "Burger", "Buns, beef, lettuce, sauce", "Grill patty, assemble burger", "Fast Food", "Grill", "Sanji", "https://placehold.co/400x300/e9a04a/white?text=Burger", "https://placehold.co/100x100/A3005A/white?text=B")
    ]

    for r in sample_recipes:
        cursor.execute("""
            INSERT INTO recipes (dish_id, name, ingredients, steps, category, subtype, char_name, img_url, char_img_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, r)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    print("Initializing database...")
    initialize_db()
    print("Database initialized successfully!")
    print("\n--- DEFAULT LOGIN CREDENTIALS ---")
    print("Admin → admin / password")
    print("User  → user / password")
    print("--------------------------------")

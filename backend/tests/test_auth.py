def test_register(client):
    response = client.post("/api/auth/register", json={
        "email": "new@example.com",
        "password": "Password123",
        "full_name": "New User",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "new@example.com"
    assert data["full_name"] == "New User"
    assert "id" in data


def test_login(client, create_user):
    create_user("login@example.com", "Password123")
    response = client.post("/api/auth/login", data={
        "username": "login@example.com",
        "password": "Password123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client, create_user):
    create_user("login@example.com", "Password123")
    response = client.post("/api/auth/login", data={
        "username": "login@example.com",
        "password": "WrongPassword",
    })
    assert response.status_code == 401


def test_me(auth_client):
    client, user = auth_client()
    response = client.get("/api/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == user.email

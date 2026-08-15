def test_upload_document(auth_client, fake_image):
    client, user = auth_client()
    response = client.post(
        "/api/documents/upload",
        files={"file": ("test.png", fake_image, "image/png")},
        data={"language_hint": "ar"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["original_filename"] == "test.png"
    assert data["mime_type"] == "image/png"
    assert data["language_hint"] == "ar"
    assert data["owner_id"] == user.id if "owner_id" in data else True


def test_list_documents(auth_client, fake_image):
    client, _ = auth_client()
    client.post(
        "/api/documents/upload",
        files={"file": ("test.png", fake_image, "image/png")},
    )
    response = client.get("/api/documents/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1


def test_get_document(auth_client, fake_image):
    client, _ = auth_client()
    upload = client.post(
        "/api/documents/upload",
        files={"file": ("test.png", fake_image, "image/png")},
    ).json()
    doc_id = upload["id"]
    response = client.get(f"/api/documents/{doc_id}")
    assert response.status_code == 200
    assert response.json()["id"] == doc_id


def test_get_document_not_found(auth_client):
    client, _ = auth_client()
    response = client.get("/api/documents/non-existent-id")
    assert response.status_code == 404

def test_export_txt(auth_client, fake_image, monkeypatch):
    client, _ = auth_client()
    upload = client.post(
        "/api/documents/upload",
        files={"file": ("test.png", fake_image, "image/png")},
    ).json()
    doc_id = upload["id"]

    from app.services import ocr_service as ocr_module
    monkeypatch.setattr(
        ocr_module.ocr_service,
        "transcribe",
        lambda image_bytes, mode, language_hint: {
            "raw_text": "بسم الله",
            "lines": ["بسم الله"],
            "words": [],
            "characters": [],
            "confidence": 0.95,
            "processing_time_ms": 100,
            "mode": mode,
        },
    )

    client.post(f"/api/ocr/{doc_id}", json={"mode": "machine"})
    response = client.post(f"/api/documents/{doc_id}/export", json={"format": "txt"})
    assert response.status_code == 200
    assert b"\xd8\xa8\xd8\xb3\xd9\x85" in response.content  # UTF-8 bytes for "بسم"


def test_export_docx(auth_client, fake_image, monkeypatch):
    client, _ = auth_client()
    upload = client.post(
        "/api/documents/upload",
        files={"file": ("test.png", fake_image, "image/png")},
    ).json()
    doc_id = upload["id"]

    from app.services import ocr_service as ocr_module
    monkeypatch.setattr(
        ocr_module.ocr_service,
        "transcribe",
        lambda image_bytes, mode, language_hint: {
            "raw_text": "test",
            "lines": ["test"],
            "words": [],
            "characters": [],
            "confidence": 0.9,
            "processing_time_ms": 100,
            "mode": mode,
        },
    )

    client.post(f"/api/ocr/{doc_id}", json={"mode": "machine"})
    response = client.post(f"/api/documents/{doc_id}/export", json={"format": "docx"})
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def test_export_pdf(auth_client, fake_image, monkeypatch):
    client, _ = auth_client()
    upload = client.post(
        "/api/documents/upload",
        files={"file": ("test.png", fake_image, "image/png")},
    ).json()
    doc_id = upload["id"]

    from app.services import ocr_service as ocr_module
    monkeypatch.setattr(
        ocr_module.ocr_service,
        "transcribe",
        lambda image_bytes, mode, language_hint: {
            "raw_text": "test",
            "lines": ["test"],
            "words": [],
            "characters": [],
            "confidence": 0.9,
            "processing_time_ms": 100,
            "mode": mode,
        },
    )

    client.post(f"/api/ocr/{doc_id}", json={"mode": "machine"})
    response = client.post(f"/api/documents/{doc_id}/export", json={"format": "pdf"})
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content[:4] == b"%PDF"

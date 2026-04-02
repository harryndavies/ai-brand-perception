from app.models.report import Report


def test_usage_empty(client, auth_headers):
    response = client.get("/api/usage", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["credits_used"] == 0
    assert data["credits_total"] == 100
    assert data["analyses_this_month"] == 0


def test_usage_with_reports(client, auth_headers, test_user, session):
    for i in range(3):
        session.add(Report(user_id=test_user.id, brand=f"Brand{i}", competitors=[], status="complete"))
    session.commit()

    response = client.get("/api/usage", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["credits_used"] == 3
    assert data["analyses_this_month"] == 3

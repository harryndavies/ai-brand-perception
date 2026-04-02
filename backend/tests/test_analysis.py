from app.services.analysis import _parse_json, _generate_trend, _emit, get_job_state, _jobs


def test_parse_json_plain():
    result = _parse_json('{"key": "value"}')
    assert result == {"key": "value"}


def test_parse_json_with_fences():
    raw = '```json\n{"key": "value"}\n```'
    result = _parse_json(raw)
    assert result == {"key": "value"}


def test_parse_json_with_bare_fences():
    raw = '```\n{"key": "value"}\n```'
    result = _parse_json(raw)
    assert result == {"key": "value"}


def test_generate_trend_length():
    data = _generate_trend(0.5)
    assert len(data) == 6
    for point in data:
        assert "date" in point
        assert "sentiment" in point
        assert "volume" in point
        assert -1 <= point["sentiment"] <= 1


def test_generate_trend_bounds():
    """Sentiment should stay within -1 to 1."""
    for _ in range(20):
        data = _generate_trend(0.95)
        for point in data:
            assert -1 <= point["sentiment"] <= 1


def test_emit_and_get_job_state():
    report_id = "test-report-emit"
    _emit(report_id, "job1", "running", 50)

    state = get_job_state(report_id)
    assert state is not None
    assert state["jobs"]["job1"]["status"] == "running"
    assert state["jobs"]["job1"]["progress"] == 50

    # Cleanup
    _jobs.pop(report_id, None)


def test_emit_multiple_jobs():
    report_id = "test-report-multi"
    _emit(report_id, "job1", "running", 30)
    _emit(report_id, "job2", "complete", 100, {"result": "ok"})

    state = get_job_state(report_id)
    assert len(state["jobs"]) == 2
    assert state["jobs"]["job2"]["data"] == {"result": "ok"}

    _jobs.pop(report_id, None)


def test_get_job_state_missing():
    assert get_job_state("nonexistent-id") is None


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["message"] == "Brand Intelligence backend is running"

# Minimal Celery config for UiPilot nightly cache promote (optional hosts).
broker_url = "redis://127.0.0.1:6379/0"
result_backend = "redis://127.0.0.1:6379/0"
timezone = "UTC"
beat_schedule = {
    "uipilot-nightly-promote": {
        "task": "tasks_promote.uipilot_nightly_promote",
        "schedule": 86400.0,
    }
}

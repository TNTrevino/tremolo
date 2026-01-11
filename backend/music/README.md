# FastAPI Music Service

### Tests

```bash
# Run all tests
pytest tests/

# Run specific test file
pytest tests/test_mary_endpoint.py -v

# Run with coverage
pytest tests/ --cov=routers --cov=models --cov-report=html

# Run only unit tests
pytest tests/ -m unit

# Run only integration tests
pytest tests/ -m integration
```

### Code Quality

Format code:
```bash
black routers/ models.py main.py tests/
```

Check code style:
```bash
flake8 routers/ models.py main.py tests/
```


## Production Deployment

See `gunicorn_config.py` for production configuration.

```bash
gunicorn main:app -c gunicorn_config.py
```


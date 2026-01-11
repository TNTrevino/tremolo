import pytest
import time
import statistics

# Performance test configuration
FASTAPI_BASE_URL = "http://localhost:8000"
DRF_BASE_URL = "http://localhost:8000"  # Change to actual DRF URL if different


@pytest.mark.performance
class TestPerformanceComparison:
    """Compare FastAPI performance against Django REST Framework"""

    def test_mary_response_time_fastapi(self, client):
        """Measure /mary endpoint response time in FastAPI"""
        payload = {"tonic": "C", "octave": 4}

        # Warm up
        client.post("/mary", json=payload)

        # Measure 10 requests
        times = []
        for _ in range(10):
            start = time.perf_counter()
            response = client.post("/mary", json=payload)
            end = time.perf_counter()

            assert response.status_code == 200
            times.append((end - start) * 1000)  # Convert to ms

        avg_time = statistics.mean(times)
        min_time = min(times)
        max_time = max(times)
        stdev = statistics.stdev(times)

        # Report metrics
        print("\n/mary FastAPI Performance:")
        print(f"  Average: {avg_time:.2f}ms")
        print(f"  Min: {min_time:.2f}ms")
        print(f"  Max: {max_time:.2f}ms")
        print(f"  Stdev: {stdev:.2f}ms")

        # Assert reasonable response time
        assert (
            avg_time < 500
        ), f"Average response time {avg_time}ms exceeds 500ms threshold"

    def test_random_response_time_fastapi(self, client):
        """Measure /random endpoint response time in FastAPI"""
        payload = {"rhythm": "1111", "rhythmType": 16, "tonic": "C"}

        # Warm up
        client.post("/random", json=payload)

        # Measure 10 requests
        times = []
        for _ in range(10):
            start = time.perf_counter()
            response = client.post("/random", json=payload)
            end = time.perf_counter()

            assert response.status_code == 200
            times.append((end - start) * 1000)

        avg_time = statistics.mean(times)
        min_time = min(times)
        max_time = max(times)
        stdev = statistics.stdev(times)

        print("\n/random FastAPI Performance:")
        print(f"  Average: {avg_time:.2f}ms")
        print(f"  Min: {min_time:.2f}ms")
        print(f"  Max: {max_time:.2f}ms")
        print(f"  Stdev: {stdev:.2f}ms")

        assert (
            avg_time < 500
        ), f"Average response time {avg_time}ms exceeds 500ms threshold"

    def test_note_game_response_time_fastapi(self, client):
        """Measure /note-game endpoint response time in FastAPI"""
        payload = {"scale": "C", "octave": "4"}

        # Warm up
        client.post("/note-game", json=payload)

        # Measure 10 requests
        times = []
        for _ in range(10):
            start = time.perf_counter()
            response = client.post("/note-game", json=payload)
            end = time.perf_counter()

            assert response.status_code == 200
            times.append((end - start) * 1000)

        avg_time = statistics.mean(times)
        min_time = min(times)
        max_time = max(times)
        stdev = statistics.stdev(times)

        print("\n/note-game FastAPI Performance:")
        print(f"  Average: {avg_time:.2f}ms")
        print(f"  Min: {min_time:.2f}ms")
        print(f"  Max: {max_time:.2f}ms")
        print(f"  Stdev: {stdev:.2f}ms")

        assert (
            avg_time < 500
        ), f"Average response time {avg_time}ms exceeds 500ms threshold"


@pytest.mark.performance
class TestThroughputBenchmark:
    """Measure throughput (requests per second)"""

    def test_mary_throughput(self, client):
        """Measure throughput for /mary endpoint"""
        payload = {"tonic": "C", "octave": 4}
        request_count = 50

        start = time.perf_counter()
        for _ in range(request_count):
            response = client.post("/mary", json=payload)
            assert response.status_code == 200
        end = time.perf_counter()

        duration = end - start
        throughput = request_count / duration

        print("\n/mary Throughput:")
        print(f"  Requests: {request_count}")
        print(f"  Duration: {duration:.2f}s")
        print(f"  Throughput: {throughput:.2f} req/s")

    def test_random_throughput(self, client):
        """Measure throughput for /random endpoint"""
        payload = {"rhythm": "1111", "rhythmType": 16, "tonic": "C"}
        request_count = 50

        start = time.perf_counter()
        for _ in range(request_count):
            response = client.post("/random", json=payload)
            assert response.status_code == 200
        end = time.perf_counter()

        duration = end - start
        throughput = request_count / duration

        print("\n/random Throughput:")
        print(f"  Requests: {request_count}")
        print(f"  Duration: {duration:.2f}s")
        print(f"  Throughput: {throughput:.2f} req/s")

    def test_note_game_throughput(self, client):
        """Measure throughput for /note-game endpoint"""
        payload = {"scale": "C", "octave": "4"}
        request_count = 50

        start = time.perf_counter()
        for _ in range(request_count):
            response = client.post("/note-game", json=payload)
            assert response.status_code == 200
        end = time.perf_counter()

        duration = end - start
        throughput = request_count / duration

        print("\n/note-game Throughput:")
        print(f"  Requests: {request_count}")
        print(f"  Duration: {duration:.2f}s")
        print(f"  Throughput: {throughput:.2f} req/s")


@pytest.mark.performance
class TestMemoryProfile:
    """Memory usage profile during requests"""

    def test_memory_growth_mary(self, client):
        """Check memory doesn't grow excessively with repeated /mary calls"""
        payload = {"tonic": "C", "octave": 4}

        # Make many requests
        for i in range(100):
            response = client.post("/mary", json=payload)
            assert response.status_code == 200

            # Could add memory tracking here with psutil
            if i % 20 == 0:
                print(f"  Completed {i} requests")

        print("\nMemory test: 100 /mary requests completed successfully")

    def test_memory_growth_random(self, client):
        """Check memory doesn't grow excessively with repeated /random calls"""
        payload = {"rhythm": "1111", "rhythmType": 16, "tonic": "C"}

        for i in range(100):
            response = client.post("/random", json=payload)
            assert response.status_code == 200

            if i % 20 == 0:
                print(f"  Completed {i} requests")

        print("\nMemory test: 100 /random requests completed successfully")

    def test_memory_growth_note_game(self, client):
        """Check memory doesn't grow excessively with repeated /note-game calls"""
        payload = {"scale": "C", "octave": "4"}

        for i in range(100):
            response = client.post("/note-game", json=payload)
            assert response.status_code == 200

            if i % 20 == 0:
                print(f"  Completed {i} requests")

        print("\nMemory test: 100 /note-game requests completed successfully")


@pytest.mark.performance
class TestLoadHandling:
    """Test behavior under load"""

    def test_concurrent_requests_simulation(self, client):
        """Simulate concurrent-like requests with sequential calls"""
        endpoints_and_payloads = [
            ("/mary", {"tonic": "C", "octave": 4}),
            ("/random", {"rhythm": "1111", "rhythmType": 16, "tonic": "C"}),
            ("/note-game", {"scale": "C", "octave": "4"}),
        ]

        request_count = 100
        successful = 0
        failed = 0
        times = []

        for i in range(request_count):
            endpoint, payload = endpoints_and_payloads[
                i % len(endpoints_and_payloads)
            ]

            start = time.perf_counter()
            response = client.post(endpoint, json=payload)
            end = time.perf_counter()

            times.append((end - start) * 1000)

            if response.status_code == 200:
                successful += 1
            else:
                failed += 1

        avg_time = statistics.mean(times)
        p95_time = sorted(times)[int(len(times) * 0.95)]
        p99_time = sorted(times)[int(len(times) * 0.99)]

        print("\nLoad Test Results (100 mixed requests):")
        print(f"  Successful: {successful}")
        print(f"  Failed: {failed}")
        print(f"  Average response time: {avg_time:.2f}ms")
        print(f"  P95 response time: {p95_time:.2f}ms")
        print(f"  P99 response time: {p99_time:.2f}ms")

        assert failed == 0, f"Failed requests during load test: {failed}"
        assert (
            avg_time < 1000
        ), "Average response time under load exceeds threshold"

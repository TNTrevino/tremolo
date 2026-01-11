import pytest


@pytest.mark.integration
class TestAllEndpointsAccessible:
    """Test that all endpoints are accessible"""

    def test_mary_endpoint_accessible(self, client):
        """Verify /mary endpoint exists and accepts requests"""
        response = client.post("/mary", json={"tonic": "C", "octave": 4})
        assert response.status_code != 404

    def test_random_endpoint_accessible(self, client):
        """Verify /random endpoint exists and accepts requests"""
        response = client.post(
            "/random", json={"rhythm": "1111", "rhythmType": 16, "tonic": "C"}
        )
        assert response.status_code != 404

    def test_note_game_endpoint_accessible(self, client):
        """Verify /note-game endpoint exists and accepts requests"""
        response = client.post("/note-game", json={"scale": "C", "octave": "4"})
        assert response.status_code != 404


@pytest.mark.integration
class TestEndpointErrorConsistency:
    """Test error handling consistency across endpoints"""

    def test_all_endpoints_handle_empty_payload(self, client):
        """All endpoints should handle empty payload gracefully"""
        endpoints = [
            ("/mary", 422),
            ("/random", 422),
            ("/note-game", 422),
        ]

        for endpoint, expected_status in endpoints:
            response = client.post(endpoint, json={})
            assert (
                response.status_code == expected_status
            ), f"Endpoint {endpoint} returned {response.status_code}, expected {expected_status}"

    def test_all_endpoints_return_errors_not_500(self, client):
        """All endpoints should return 400/422, not 500 for bad input"""
        test_cases = [
            ("/mary", {"tonic": "INVALID", "octave": 4}),
            ("/random", {"rhythm": "INVALID", "rhythmType": 16, "tonic": "C"}),
            ("/note-game", {"scale": "INVALID", "octave": "4"}),
        ]

        for endpoint, payload in test_cases:
            response = client.post(endpoint, json=payload)
            assert response.status_code in [
                400,
                422,
            ], f"Endpoint {endpoint} returned {response.status_code} for bad input, expected 400/422"


@pytest.mark.integration
class TestMultipleRequestsHandling:
    """Test handling of multiple requests"""

    def test_mary_multiple_sequential_requests(self, client):
        """Multiple sequential requests to /mary should all succeed"""
        for i in range(5):
            response = client.post("/mary", json={"tonic": "C", "octave": 4})
            assert response.status_code == 200, f"Request {i} failed"

    def test_random_multiple_sequential_requests(self, client):
        """Multiple sequential requests to /random should all succeed"""
        for i in range(5):
            response = client.post(
                "/random",
                json={"rhythm": "1111", "rhythmType": 16, "tonic": "C"},
            )
            assert response.status_code == 200, f"Request {i} failed"

    def test_note_game_multiple_sequential_requests(self, client):
        """Multiple sequential requests to /note-game should all succeed"""
        for i in range(5):
            response = client.post(
                "/note-game", json={"scale": "C", "octave": "4"}
            )
            assert response.status_code == 200, f"Request {i} failed"

    def test_mixed_endpoint_requests(self, client):
        """Should be able to call different endpoints in sequence"""
        payloads = [
            ("post", "/mary", {"tonic": "C", "octave": 4}),
            (
                "post",
                "/random",
                {"rhythm": "1111", "rhythmType": 16, "tonic": "C"},
            ),
            ("post", "/note-game", {"scale": "C", "octave": "4"}),
            ("post", "/mary", {"tonic": "G", "octave": 5}),
            (
                "post",
                "/random",
                {"rhythm": "11", "rhythmType": 8, "tonic": "G"},
            ),
        ]

        for method, endpoint, payload in payloads:
            response = client.post(endpoint, json=payload)
            assert (
                response.status_code == 200
            ), f"Failed to call {endpoint} with {payload}"


@pytest.mark.integration
class TestResponseConsistency:
    """Test response consistency across multiple calls"""

    def test_mary_consistent_response_format(self, client):
        """Multiple /mary calls should have consistent response format"""
        for _ in range(3):
            response = client.post("/mary", json={"tonic": "C", "octave": 4})
            assert response.status_code == 200
            assert response.headers["content-type"] == "application/xml"
            assert isinstance(response.content, bytes)

    def test_random_consistent_response_format(self, client):
        """Multiple /random calls should have consistent response format"""
        for _ in range(3):
            response = client.post(
                "/random",
                json={"rhythm": "1111", "rhythmType": 16, "tonic": "C"},
            )
            assert response.status_code == 200
            assert response.headers["content-type"] == "application/xml"
            assert isinstance(response.content, bytes)

    def test_note_game_consistent_response_format(self, client):
        """Multiple /note-game calls should have consistent response format"""
        for _ in range(3):
            response = client.post(
                "/note-game", json={"scale": "C", "octave": "4"}
            )
            assert response.status_code == 200
            assert "application/json" in response.headers["content-type"]

            data = response.json()
            assert "generatedXml" in data
            assert "noteName" in data
            assert "noteOctave" in data


@pytest.mark.integration
class TestEndpointIndependence:
    """Test that endpoints don't interfere with each other"""

    def test_endpoint_calls_dont_affect_next_call(self, client):
        """Calling one endpoint shouldn't affect results from another"""
        # Call /mary
        response1 = client.post("/mary", json={"tonic": "C", "octave": 4})
        assert response1.status_code == 200

        # Call /random
        response2 = client.post(
            "/random", json={"rhythm": "1111", "rhythmType": 16, "tonic": "C"}
        )
        assert response2.status_code == 200

        # Call /mary again with different input
        response3 = client.post("/mary", json={"tonic": "G", "octave": 5})
        assert response3.status_code == 200

        # First and third responses should be different (different input)
        assert response1.content != response3.content


@pytest.mark.integration
class TestConcurrentLikeRequests:
    """Test rapid sequential requests (simulates concurrency)"""

    def test_rapid_mary_requests(self, client):
        """Rapid sequential requests to /mary"""
        responses = []
        for _ in range(10):
            response = client.post("/mary", json={"tonic": "C", "octave": 4})
            assert response.status_code == 200
            responses.append(response)

        # All should be successful
        assert all(r.status_code == 200 for r in responses)

    def test_rapid_random_requests(self, client):
        """Rapid sequential requests to /random"""
        responses = []
        for _ in range(10):
            response = client.post(
                "/random",
                json={"rhythm": "1111", "rhythmType": 16, "tonic": "C"},
            )
            assert response.status_code == 200
            responses.append(response)

        # All should be successful
        assert all(r.status_code == 200 for r in responses)

    def test_rapid_note_game_requests(self, client):
        """Rapid sequential requests to /note-game"""
        responses = []
        for _ in range(10):
            response = client.post(
                "/note-game", json={"scale": "C", "octave": "4"}
            )
            assert response.status_code == 200
            responses.append(response)

        # All should be successful
        assert all(r.status_code == 200 for r in responses)

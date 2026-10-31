"""Client construction tests, replacing the import-time live-login diagnostic."""
from unittest.mock import Mock

import pytest

import supabase_client as module


@pytest.fixture
def factory(monkeypatch):
    module.get_user_scoped_client.cache_clear()
    factory = Mock(side_effect=lambda *args: Mock())
    monkeypatch.setattr(module, "create_client", factory)
    yield factory
    module.get_user_scoped_client.cache_clear()


def test_scoped_client_uses_anon_key_and_binds_user_token(factory):
    client = module.get_user_scoped_client("fake-user-token")
    factory.assert_called_once_with(module.SUPABASE_URL, module.SUPABASE_KEY)
    client.postgrest.auth.assert_called_once_with("fake-user-token")


def test_same_token_reuses_client(factory):
    first = module.get_user_scoped_client("fake-user-token")
    assert module.get_user_scoped_client("fake-user-token") is first
    assert factory.call_count == 1


def test_different_tokens_have_separate_clients(factory):
    first = module.get_user_scoped_client("fake-first-token")
    second = module.get_user_scoped_client("fake-second-token")
    assert first is not second
    assert factory.call_count == 2
    first.postgrest.auth.assert_called_once_with("fake-first-token")
    second.postgrest.auth.assert_called_once_with("fake-second-token")

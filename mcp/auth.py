import asyncio
import json
import logging

import jwt as pyjwt
from jwt import PyJWKClient
from mcp.server.auth.provider import AccessToken, TokenVerifier

from config import settings

logger = logging.getLogger(__name__)

_jwks_client: PyJWKClient | None = None

_ACCEPTED_AUDIENCES = {"authenticated"}


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url)
    return _jwks_client


def _decode_with_audience(token: str, key, algorithms: list[str]) -> dict | None:
    for aud in _ACCEPTED_AUDIENCES:
        try:
            return pyjwt.decode(token, key, algorithms=algorithms, audience=aud)
        except pyjwt.InvalidAudienceError:
            continue
        except pyjwt.PyJWTError:
            return None
    try:
        return pyjwt.decode(token, key, algorithms=algorithms, options={"verify_aud": False})
    except pyjwt.PyJWTError:
        return None


class SupabaseTokenVerifier(TokenVerifier):

    async def verify_token(self, token: str) -> AccessToken | None:
        payload = await self._decode_jwt(token)
        if payload is None:
            return None

        sub = payload.get("sub", "")
        if not sub:
            logger.warning("JWT has no sub claim")
            return None

        scopes = []
        scope_str = payload.get("scope", "")
        if isinstance(scope_str, str) and scope_str:
            scopes = scope_str.split()

        logger.info("MCP auth: %s", sub)
        return AccessToken(
            token=token,
            client_id=sub,
            scopes=scopes,
            extra={"claims": payload},
        )

    async def _decode_jwt(self, token: str) -> dict | None:
        if settings.SUPABASE_URL:
            try:
                signing_key = await asyncio.to_thread(
                    _get_jwks_client().get_signing_key_from_jwt, token
                )
                payload = _decode_with_audience(token, signing_key.key, ["RS256", "ES256"])
                if payload:
                    return payload
            except Exception as e:
                logger.debug("JWKS decode failed: %s", e)

        if settings.SUPABASE_JWT_SECRET:
            payload = _decode_with_audience(token, settings.SUPABASE_JWT_SECRET, ["HS256"])
            if payload:
                return payload

        return None

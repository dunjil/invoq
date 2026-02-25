"""GeoIP service for country detection from IP addresses."""

import httpx
from typing import Optional, Tuple


class GeoIPService:
    """Service to get country information from IP addresses using ip-api.com."""

    # Simple in-memory cache
    _cache: dict[str, Tuple[Optional[str], Optional[str]]] = {}

    @classmethod
    async def get_country(cls, ip_address: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Get country code and name from IP address.
        Returns Tuple of (country_code, country_name) or (None, None).
        """
        if not ip_address:
            return None, None

        # Skip local/private IPs
        if ip_address in ("127.0.0.1", "localhost", "unknown", "::1"):
            return None, None

        if ip_address.startswith(("10.", "172.16.", "192.168.")):
            return None, None

        if ip_address in cls._cache:
            return cls._cache[ip_address]

        try:
            # Free tier: 45 requests/minute
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(
                    f"http://ip-api.com/json/{ip_address}",
                    params={"fields": "status,country,countryCode"}
                )

                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("status") == "success":
                        country_code = data.get("countryCode")
                        country_name = data.get("country")
                        
                        cls._cache[ip_address] = (country_code, country_name)
                        
                        # simple cache management
                        if len(cls._cache) > 5000:
                            cls._cache.clear()
                            
                        return country_code, country_name
        except Exception:
            pass

        return None, None

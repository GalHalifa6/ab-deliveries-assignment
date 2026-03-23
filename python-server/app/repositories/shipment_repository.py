from app.db import shipments_collection


class ShipmentRepository:
    def __init__(self, collection):
        self.collection = collection

    def get_by_tracking_number(self, tracking_number: str):
        return self.collection.find_one({"trackingNumber": tracking_number.strip().upper()})

    def get_recent_by_phone(self, phone: str, limit: int = 5):
        cursor = (
            self.collection.find({"phone": phone.strip()})
            .sort("updatedAt", -1)
            .limit(limit)
        )
        return list(cursor)


shipment_repository = ShipmentRepository(shipments_collection)

__all__ = ["ShipmentRepository", "shipment_repository"]

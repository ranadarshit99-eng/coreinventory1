from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import (User, UserRole, Category, Warehouse, Location, LocationType,
                         Product, StockLedger, Receipt, ReceiptLine, Delivery, DeliveryLine,
                         Adjustment, AdjustmentLine, MoveHistory, MoveType, OperationStatus, AppSettings)
from app.utils.security import hash_password
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)

def seed_database():
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            logger.info("Database already seeded, skipping.")
            return

        logger.info("Seeding database...")

        # --- Users ---
        users = [
            User(full_name="Admin User", email="admin@coreinventory.com", phone="+1234567890",
                 hashed_password=hash_password("Admin@123"), role=UserRole.admin, avatar_color="#7C3AED"),
            User(full_name="John Manager", email="manager@coreinventory.com", phone="+1234567891",
                 hashed_password=hash_password("Manager@123"), role=UserRole.manager, avatar_color="#0EA5E9"),
            User(full_name="Sara Sales", email="sales@coreinventory.com", phone="+1234567892",
                 hashed_password=hash_password("Sales@123"), role=UserRole.sales, avatar_color="#10B981"),
            User(full_name="Tom Warehouse", email="warehouse@coreinventory.com", phone="+1234567893",
                 hashed_password=hash_password("Warehouse@123"), role=UserRole.warehouse, avatar_color="#F59E0B"),
            User(full_name="Eve Viewer", email="viewer@coreinventory.com", phone="+1234567894",
                 hashed_password=hash_password("Viewer@123"), role=UserRole.viewer, avatar_color="#6B7280"),
        ]
        db.add_all(users)
        db.flush()

        # --- Categories ---
        cats = [
            Category(name="Raw Materials", description="Base materials for production"),
            Category(name="Finished Goods", description="Ready-to-ship products"),
            Category(name="Packaging", description="Boxes, bags, and wrapping materials"),
            Category(name="Electronics", description="Electronic components and devices"),
            Category(name="Spare Parts", description="Replacement parts and components"),
        ]
        db.add_all(cats)
        db.flush()

        # --- Warehouses ---
        wh1 = Warehouse(name="Main Warehouse", short_code="MAIN", address="123 Industrial Ave, New York, NY 10001", manager="John Manager")
        wh2 = Warehouse(name="Production Floor", short_code="PROD", address="123 Industrial Ave, New York, NY 10001", manager="Tom Warehouse")
        wh3 = Warehouse(name="Cold Storage", short_code="COLD", address="456 Freeze Blvd, Chicago, IL 60601", manager="John Manager")
        db.add_all([wh1, wh2, wh3])
        db.flush()

        # --- Locations ---
        locs = [
            Location(name="Receiving Bay", warehouse_id=wh1.id, location_type=LocationType.input),
            Location(name="Shelf A1", warehouse_id=wh1.id, location_type=LocationType.internal),
            Location(name="Shelf A2", warehouse_id=wh1.id, location_type=LocationType.internal),
            Location(name="Dispatch Area", warehouse_id=wh1.id, location_type=LocationType.output),
            Location(name="Assembly Line 1", warehouse_id=wh2.id, location_type=LocationType.internal),
            Location(name="QC Zone", warehouse_id=wh2.id, location_type=LocationType.internal),
            Location(name="Freezer Zone A", warehouse_id=wh3.id, location_type=LocationType.internal),
        ]
        db.add_all(locs)
        db.flush()

        # --- Products ---
        products_data = [
            dict(name="Steel Rod 10mm", sku="STL-ROD-10", category_id=cats[0].id, uom="kg", reorder_point=50),
            dict(name="Aluminum Sheet 2mm", sku="ALU-SHT-02", category_id=cats[0].id, uom="kg", reorder_point=30),
            dict(name="Copper Wire 1.5mm", sku="CPR-WIR-15", category_id=cats[0].id, uom="meters", reorder_point=100),
            dict(name="Precision Gear Set", sku="GER-PRE-01", category_id=cats[4].id, uom="pieces", reorder_point=20),
            dict(name="Assembled Motor Unit", sku="MTR-ASM-01", category_id=cats[1].id, uom="pieces", reorder_point=10),
            dict(name="Control Board v2", sku="PCB-CTL-V2", category_id=cats[3].id, uom="pieces", reorder_point=15),
            dict(name="Cardboard Box L", sku="PKG-BOX-L", category_id=cats[2].id, uom="pieces", reorder_point=200),
            dict(name="Bubble Wrap Roll", sku="PKG-BWR-01", category_id=cats[2].id, uom="meters", reorder_point=50),
            dict(name="Bearing 6205", sku="BRG-6205", category_id=cats[4].id, uom="pieces", reorder_point=25),
            dict(name="LED Driver Module", sku="LED-DRV-01", category_id=cats[3].id, uom="pieces", reorder_point=10),
        ]
        prods = []
        for pd in products_data:
            p = Product(**pd, description=f"Standard {pd['name']} for industrial use")
            db.add(p)
            prods.append(p)
        db.flush()

        # --- Stock (some low, some out) ---
        stock_data = [
            (prods[0], wh1.id, 250), (prods[0], wh2.id, 80),
            (prods[1], wh1.id, 120),
            (prods[2], wh1.id, 8),   # LOW
            (prods[3], wh1.id, 0),   # OUT
            (prods[4], wh1.id, 45), (prods[4], wh2.id, 12),
            (prods[5], wh1.id, 3),   # LOW
            (prods[6], wh1.id, 500),
            (prods[7], wh1.id, 0),   # OUT
            (prods[8], wh1.id, 18), (prods[8], wh2.id, 10),
            (prods[9], wh1.id, 5),   # LOW
        ]
        for prod, wh_id, qty in stock_data:
            db.add(StockLedger(product_id=prod.id, warehouse_id=wh_id, quantity=qty))
        db.flush()

        now = datetime.now(timezone.utc)

        # --- Receipts ---
        r1 = Receipt(reference="RCP-0001", supplier="Steel Suppliers Co.", status=OperationStatus.done,
                     scheduled_date=now - timedelta(days=10), warehouse_id=wh1.id, created_by=users[1].id)
        db.add(r1)
        db.flush()
        db.add_all([
            ReceiptLine(receipt_id=r1.id, product_id=prods[0].id, expected_qty=300, received_qty=300, uom="kg"),
            ReceiptLine(receipt_id=r1.id, product_id=prods[1].id, expected_qty=150, received_qty=120, uom="kg"),
        ])

        r2 = Receipt(reference="RCP-0002", supplier="Electronic Parts Ltd.", status=OperationStatus.done,
                     scheduled_date=now - timedelta(days=5), warehouse_id=wh1.id, created_by=users[1].id)
        db.add(r2)
        db.flush()
        db.add_all([
            ReceiptLine(receipt_id=r2.id, product_id=prods[5].id, expected_qty=50, received_qty=50, uom="pieces"),
            ReceiptLine(receipt_id=r2.id, product_id=prods[9].id, expected_qty=30, received_qty=30, uom="pieces"),
        ])

        r3 = Receipt(reference="RCP-0003", supplier="Packaging World", status=OperationStatus.waiting,
                     scheduled_date=now + timedelta(days=2), warehouse_id=wh1.id, created_by=users[2].id)
        db.add(r3)
        db.flush()
        db.add_all([
            ReceiptLine(receipt_id=r3.id, product_id=prods[6].id, expected_qty=1000, received_qty=0, uom="pieces"),
            ReceiptLine(receipt_id=r3.id, product_id=prods[7].id, expected_qty=200, received_qty=0, uom="meters"),
        ])

        r4 = Receipt(reference="RCP-0004", supplier="Metal Works Inc.", status=OperationStatus.draft,
                     scheduled_date=now + timedelta(days=5), warehouse_id=wh1.id, created_by=users[1].id)
        db.add(r4)
        db.flush()
        db.add(ReceiptLine(receipt_id=r4.id, product_id=prods[2].id, expected_qty=500, received_qty=0, uom="meters"))

        # --- Deliveries ---
        d1 = Delivery(reference="DEL-0001", customer="Acme Industries", status=OperationStatus.done,
                      scheduled_date=now - timedelta(days=3), warehouse_id=wh1.id, step="done", created_by=users[2].id)
        db.add(d1)
        db.flush()
        db.add_all([
            DeliveryLine(delivery_id=d1.id, product_id=prods[4].id, qty=5, uom="pieces"),
            DeliveryLine(delivery_id=d1.id, product_id=prods[8].id, qty=10, uom="pieces"),
        ])

        d2 = Delivery(reference="DEL-0002", customer="Global Tech Corp", status=OperationStatus.ready,
                      scheduled_date=now + timedelta(days=1), warehouse_id=wh1.id, step="pack", created_by=users[2].id)
        db.add(d2)
        db.flush()
        db.add_all([
            DeliveryLine(delivery_id=d2.id, product_id=prods[0].id, qty=50, uom="kg"),
            DeliveryLine(delivery_id=d2.id, product_id=prods[5].id, qty=2, uom="pieces"),
        ])

        # --- Adjustments ---
        a1 = Adjustment(reference="ADJ-0001", warehouse_id=wh1.id, reason="Physical Count",
                        status=OperationStatus.done, date=now - timedelta(days=7), created_by=users[3].id)
        db.add(a1)
        db.flush()
        db.add_all([
            AdjustmentLine(adjustment_id=a1.id, product_id=prods[0].id, system_qty=260, counted_qty=250, difference=-10),
            AdjustmentLine(adjustment_id=a1.id, product_id=prods[4].id, system_qty=40, counted_qty=45, difference=5),
        ])

        # --- Move History ---
        moves = [
            MoveHistory(move_type=MoveType.receipt, reference="RCP-0001", product_id=prods[0].id,
                        to_warehouse_id=wh1.id, qty=300, done_by=users[1].id, date=now - timedelta(days=10)),
            MoveHistory(move_type=MoveType.receipt, reference="RCP-0001", product_id=prods[1].id,
                        to_warehouse_id=wh1.id, qty=120, done_by=users[1].id, date=now - timedelta(days=10)),
            MoveHistory(move_type=MoveType.receipt, reference="RCP-0002", product_id=prods[5].id,
                        to_warehouse_id=wh1.id, qty=50, done_by=users[1].id, date=now - timedelta(days=5)),
            MoveHistory(move_type=MoveType.delivery, reference="DEL-0001", product_id=prods[4].id,
                        from_warehouse_id=wh1.id, qty=5, done_by=users[2].id, date=now - timedelta(days=3)),
            MoveHistory(move_type=MoveType.adjustment, reference="ADJ-0001", product_id=prods[0].id,
                        from_warehouse_id=wh1.id, qty=10, done_by=users[3].id, date=now - timedelta(days=7)),
            MoveHistory(move_type=MoveType.adjustment, reference="ADJ-0001", product_id=prods[4].id,
                        to_warehouse_id=wh1.id, qty=5, done_by=users[3].id, date=now - timedelta(days=7)),
        ]
        db.add_all(moves)

        # --- App Settings ---
        db.add(AppSettings(company_name="CoreInventory Corp", default_warehouse_id=wh1.id,
                           low_stock_threshold=10, currency="$", date_format="MM/DD/YYYY"))

        db.commit()
        logger.info("✅ Database seeded successfully!")
        print("\n" + "="*60)
        print("✅ CoreInventory database seeded!")
        print("Default accounts:")
        print("  admin@coreinventory.com  / Admin@123  (Admin)")
        print("  manager@coreinventory.com / Manager@123 (Manager)")
        print("  sales@coreinventory.com  / Sales@123  (Sales)")
        print("  warehouse@coreinventory.com / Warehouse@123 (Warehouse)")
        print("  viewer@coreinventory.com / Viewer@123  (Viewer)")
        print("="*60 + "\n")

    except Exception as e:
        db.rollback()
        logger.error(f"Seed error: {e}")
        raise
    finally:
        db.close()

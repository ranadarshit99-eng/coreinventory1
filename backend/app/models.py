from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

class UserRole(str, enum.Enum):
    admin = "admin"
    manager = "manager"
    sales = "sales"
    warehouse = "warehouse"
    viewer = "viewer"

class OperationStatus(str, enum.Enum):
    draft = "draft"
    waiting = "waiting"
    ready = "ready"
    done = "done"
    canceled = "canceled"

class MoveType(str, enum.Enum):
    receipt = "receipt"
    delivery = "delivery"
    transfer = "transfer"
    adjustment = "adjustment"

class LocationType(str, enum.Enum):
    internal = "internal"
    input = "input"
    output = "output"
    virtual = "virtual"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.viewer)
    is_active = Column(Boolean, default=True)
    avatar_color = Column(String, default="#2563EB")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class OTPCode(Base):
    __tablename__ = "otp_codes"
    id = Column(Integer, primary_key=True, index=True)
    identifier = Column(String, index=True)  # email or phone
    code = Column(String, nullable=False)
    purpose = Column(String, default="login")  # login, reset
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    products = relationship("Product", back_populates="category")

class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    short_code = Column(String, unique=True, nullable=False)
    address = Column(Text, nullable=True)
    manager = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    locations = relationship("Location", back_populates="warehouse")
    stock = relationship("StockLedger", back_populates="warehouse")

class Location(Base):
    __tablename__ = "locations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    location_type = Column(Enum(LocationType), default=LocationType.internal)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    warehouse = relationship("Warehouse", back_populates="locations")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    sku = Column(String, unique=True, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    uom = Column(String, default="pieces")
    reorder_point = Column(Float, default=10)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    category = relationship("Category", back_populates="products")
    stock = relationship("StockLedger", back_populates="product")

class StockLedger(Base):
    __tablename__ = "stock_ledger"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    quantity = Column(Float, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    product = relationship("Product", back_populates="stock")
    warehouse = relationship("Warehouse", back_populates="stock")

class Receipt(Base):
    __tablename__ = "receipts"
    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String, unique=True, nullable=False)
    supplier = Column(String, nullable=False)
    status = Column(Enum(OperationStatus), default=OperationStatus.draft)
    scheduled_date = Column(DateTime(timezone=True), nullable=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    lines = relationship("ReceiptLine", back_populates="receipt", cascade="all, delete-orphan")
    warehouse = relationship("Warehouse")

class ReceiptLine(Base):
    __tablename__ = "receipt_lines"
    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("receipts.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    expected_qty = Column(Float, default=0)
    received_qty = Column(Float, default=0)
    uom = Column(String, default="pieces")
    receipt = relationship("Receipt", back_populates="lines")
    product = relationship("Product")

class Delivery(Base):
    __tablename__ = "deliveries"
    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String, unique=True, nullable=False)
    customer = Column(String, nullable=False)
    status = Column(Enum(OperationStatus), default=OperationStatus.draft)
    scheduled_date = Column(DateTime(timezone=True), nullable=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    step = Column(String, default="pick")
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    lines = relationship("DeliveryLine", back_populates="delivery", cascade="all, delete-orphan")
    warehouse = relationship("Warehouse")

class DeliveryLine(Base):
    __tablename__ = "delivery_lines"
    id = Column(Integer, primary_key=True, index=True)
    delivery_id = Column(Integer, ForeignKey("deliveries.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    qty = Column(Float, default=0)
    uom = Column(String, default="pieces")
    delivery = relationship("Delivery", back_populates="lines")
    product = relationship("Product")

class Transfer(Base):
    __tablename__ = "transfers"
    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String, unique=True, nullable=False)
    from_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    to_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    status = Column(Enum(OperationStatus), default=OperationStatus.draft)
    date = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    lines = relationship("TransferLine", back_populates="transfer", cascade="all, delete-orphan")
    from_warehouse = relationship("Warehouse", foreign_keys=[from_warehouse_id])
    to_warehouse = relationship("Warehouse", foreign_keys=[to_warehouse_id])

class TransferLine(Base):
    __tablename__ = "transfer_lines"
    id = Column(Integer, primary_key=True, index=True)
    transfer_id = Column(Integer, ForeignKey("transfers.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    qty = Column(Float, default=0)
    uom = Column(String, default="pieces")
    transfer = relationship("Transfer", back_populates="lines")
    product = relationship("Product")

class Adjustment(Base):
    __tablename__ = "adjustments"
    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String, unique=True, nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    reason = Column(String, default="Physical Count")
    status = Column(Enum(OperationStatus), default=OperationStatus.draft)
    date = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    lines = relationship("AdjustmentLine", back_populates="adjustment", cascade="all, delete-orphan")
    warehouse = relationship("Warehouse")

class AdjustmentLine(Base):
    __tablename__ = "adjustment_lines"
    id = Column(Integer, primary_key=True, index=True)
    adjustment_id = Column(Integer, ForeignKey("adjustments.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    system_qty = Column(Float, default=0)
    counted_qty = Column(Float, default=0)
    difference = Column(Float, default=0)
    adjustment = relationship("Adjustment", back_populates="lines")
    product = relationship("Product")

class MoveHistory(Base):
    __tablename__ = "move_history"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime(timezone=True), server_default=func.now())
    move_type = Column(Enum(MoveType), nullable=False)
    reference = Column(String, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    from_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    to_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    qty = Column(Float, nullable=False)
    done_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    product = relationship("Product")
    from_warehouse = relationship("Warehouse", foreign_keys=[from_warehouse_id])
    to_warehouse = relationship("Warehouse", foreign_keys=[to_warehouse_id])
    user = relationship("User", foreign_keys=[done_by])

class AppSettings(Base):
    __tablename__ = "app_settings"
    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, default="CoreInventory Corp")
    default_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    low_stock_threshold = Column(Float, default=10)
    currency = Column(String, default="$")
    date_format = Column(String, default="MM/DD/YYYY")

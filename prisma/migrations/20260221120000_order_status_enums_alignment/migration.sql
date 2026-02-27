DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EcommerceOrderStatus') THEN
    CREATE TYPE "EcommerceOrderStatus" AS ENUM (
      'PENDING',
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StitchingOrderStatus') THEN
    CREATE TYPE "StitchingOrderStatus" AS ENUM (
      'PENDING',
      'ASSIGNED',
      'STITCHING',
      'QC',
      'COMPLETED',
      'DELIVERED',
      'CANCELLED'
    );
  END IF;
END $$;

ALTER TABLE "Order"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Order"
  ALTER COLUMN "status" TYPE "EcommerceOrderStatus"
  USING (
    CASE "status"::text
      WHEN 'PENDING' THEN 'PENDING'
      WHEN 'ASSIGNED' THEN 'PROCESSING'
      WHEN 'STITCHING' THEN 'PROCESSING'
      WHEN 'COMPLETED' THEN 'DELIVERED'
      WHEN 'DELIVERED' THEN 'DELIVERED'
      WHEN 'CANCELLED' THEN 'CANCELLED'
      ELSE 'PENDING'
    END
  )::"EcommerceOrderStatus";

ALTER TABLE "Order"
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "StitchingOrder"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "StitchingOrder"
  ALTER COLUMN "status" TYPE "StitchingOrderStatus"
  USING (
    CASE "status"::text
      WHEN 'PENDING' THEN 'PENDING'
      WHEN 'ASSIGNED' THEN 'ASSIGNED'
      WHEN 'STITCHING' THEN 'STITCHING'
      WHEN 'COMPLETED' THEN 'COMPLETED'
      WHEN 'DELIVERED' THEN 'DELIVERED'
      WHEN 'CANCELLED' THEN 'CANCELLED'
      ELSE 'PENDING'
    END
  )::"StitchingOrderStatus";

ALTER TABLE "StitchingOrder"
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
    DROP TYPE "OrderStatus";
  END IF;
END $$;

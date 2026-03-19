// admin/src/app/api/graphql/schema.ts
// GraphQL SDL type definitions for the platform

export const typeDefs = /* GraphQL */ `
  scalar JSON
  scalar DateTime

  enum ProductStatus {
    DRAFT
    ACTIVE
    ARCHIVED
  }

  enum PrintJobStatus {
    QUEUED
    PRINTING
    DONE
    FAILED
  }

  enum MetaFieldType {
    TEXT
    NUMBER
    BOOLEAN
    DATE
    JSON
    URL
  }

  enum MetaAppliesTo {
    PRODUCT
    ORDER
    CUSTOMER
  }

  # ── Shop ──────────────────────────────────────────────────────────

  type Shop {
    id:           ID!
    name:         String!
    logoUrl:      String
    addressLine1: String
    addressLine2: String
    city:         String
    state:        String
    zip:          String
    country:      String!
    phone:        String
    email:        String
    accentColor:  String!
    footerCopy:   String
    invoiceNotes: String
    createdAt:    DateTime!
    updatedAt:    DateTime!
  }

  # ── Products ──────────────────────────────────────────────────────

  type Product {
    id:             ID!
    shopId:         String
    title:          String!
    description:    String!
    status:         ProductStatus!
    price:          Float!
    compareAtPrice: Float
    cost:           Float
    inventory:      Int!
    sku:            String
    barcode:        String
    weight:         Float
    vendor:         String
    tags:           [String!]!
    images:         JSON!
    createdAt:      DateTime!
    updatedAt:      DateTime!
  }

  # ── Orders ────────────────────────────────────────────────────────

  type Order {
    id:             ID!
    shopId:         String
    currency:       String!
    subtotal:       Float!
    taxAmount:      Float!
    shippingAmount: Float!
    total:          Float!
    status:         String!
    note:           String
    customer:       OrderCustomer!
    items:          [OrderItem!]!
    fulfillment:    Fulfillment
    createdAt:      DateTime!
    updatedAt:      DateTime!
  }

  type OrderCustomer {
    id:    ID!
    name:  String
    email: String
  }

  type OrderItem {
    id:        ID!
    quantity:  Int!
    price:     Float!
    productId: String!
    product:   Product
  }

  type Fulfillment {
    id:             ID!
    trackingNumber: String
    carrier:        String
    shippedAt:      DateTime
    deliveredAt:    DateTime
    notes:          String
    createdAt:      DateTime!
    updatedAt:      DateTime!
  }

  # ── Customers ─────────────────────────────────────────────────────

  type Customer {
    id:        ID!
    shopId:    String!
    email:     String!
    phone:     String
    firstName: String
    lastName:  String
    tags:      [String!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # ── Metafields ────────────────────────────────────────────────────

  type MetaDefinition {
    id:          ID!
    shopId:      String!
    namespace:   String!
    key:         String!
    displayName: String!
    type:        MetaFieldType!
    appliesTo:   MetaAppliesTo!
    required:    Boolean!
    createdAt:   DateTime!
    updatedAt:   DateTime!
  }

  type MetaValue {
    id:          ID!
    definitionId: String!
    entityType:  MetaAppliesTo!
    entityId:    String!
    jsonValue:   JSON!
    definition:  MetaDefinition!
    updatedAt:   DateTime!
  }

  # ── PrintJob ──────────────────────────────────────────────────────

  type PrintJob {
    id:          ID!
    shopId:      String!
    type:        String!
    status:      PrintJobStatus!
    assetUrl:    String
    printerName: String
    metadata:    JSON!
    errorText:   String
    reportedAt:  DateTime
    createdAt:   DateTime!
    updatedAt:   DateTime!
  }

  # ── Inventory adjustment ──────────────────────────────────────────

  type InventoryAdjustment {
    id:          ID!
    productId:   String!
    shopId:      String!
    delta:       Int!
    reason:      String
    createdById: String
    createdAt:   DateTime!
  }

  # ── Inputs ────────────────────────────────────────────────────────

  input CreateProductInput {
    title:          String!
    description:    String
    status:         ProductStatus
    price:          Float!
    compareAtPrice: Float
    cost:           Float
    inventory:      Int
    sku:            String
    barcode:        String
    weight:         Float
    vendor:         String
    tags:           [String!]
  }

  input UpdateProductInput {
    title:          String
    description:    String
    status:         ProductStatus
    price:          Float
    compareAtPrice: Float
    cost:           Float
    inventory:      Int
    sku:            String
    barcode:        String
    weight:         Float
    vendor:         String
    tags:           [String!]
  }

  input FulfillmentInput {
    trackingNumber: String
    carrier:        String
    shippedAt:      DateTime
    notes:          String
  }

  input CreateMetaDefinitionInput {
    namespace:   String!
    key:         String!
    displayName: String!
    type:        MetaFieldType!
    appliesTo:   MetaAppliesTo!
    required:    Boolean
  }

  input SetMetaValueInput {
    definitionId: ID!
    entityType:   MetaAppliesTo!
    entityId:     ID!
    jsonValue:    JSON!
  }

  input CreatePrintJobInput {
    type:       String!
    assetUrl:   String
    printerName: String
    metadata:   JSON
  }

  input AdjustInventoryInput {
    productId: ID!
    delta:     Int!
    reason:    String
  }

  input UpdateShopInput {
    name:         String
    logoUrl:      String
    addressLine1: String
    addressLine2: String
    city:         String
    state:        String
    zip:          String
    country:      String
    phone:        String
    email:        String
    accentColor:  String
    footerCopy:   String
    invoiceNotes: String
  }

  # ── Root types ────────────────────────────────────────────────────

  type Query {
    shop:              Shop
    products(search: String, status: ProductStatus): [Product!]!
    product(id: ID!):  Product
    orders(status: String, limit: Int): [Order!]!
    order(id: ID!):    Order
    customers(search: String): [Customer!]!
    customer(id: ID!): Customer
    printJobs(status: PrintJobStatus): [PrintJob!]!
    metaDefinitions(appliesTo: MetaAppliesTo): [MetaDefinition!]!
    metaValues(entityType: MetaAppliesTo!, entityId: ID!): [MetaValue!]!
    inventoryAdjustments(productId: ID!): [InventoryAdjustment!]!
  }

  type Mutation {
    # Products
    createProduct(input: CreateProductInput!): Product!
    updateProduct(id: ID!, input: UpdateProductInput!): Product!
    deleteProduct(id: ID!): Boolean!
    adjustInventory(input: AdjustInventoryInput!): Product!

    # Orders
    updateOrderStatus(id: ID!, status: String!): Order!
    createFulfillment(orderId: ID!, input: FulfillmentInput!): Fulfillment!

    # Shop settings
    updateShop(input: UpdateShopInput!): Shop!

    # Metafields
    createMetaDefinition(input: CreateMetaDefinitionInput!): MetaDefinition!
    setMetaValue(input: SetMetaValueInput!): MetaValue!
    deleteMetaDefinition(id: ID!): Boolean!

    # PrintJobs
    createPrintJob(input: CreatePrintJobInput!): PrintJob!
    reportPrintJobStatus(id: ID!, status: PrintJobStatus!, errorText: String): PrintJob!
  }
`;

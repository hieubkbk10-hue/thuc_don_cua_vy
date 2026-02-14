import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  menuItems: defineTable({
    name: v.string(),
    note: v.string(),
    struck: v.boolean(),
    order: v.number(),
    createdAt: v.number(),
  }).index("by_order", ["order"]),
});

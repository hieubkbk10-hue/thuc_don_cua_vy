import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("menuItems").withIndex("by_order").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const last = await ctx.db
      .query("menuItems")
      .withIndex("by_order")
      .order("desc")
      .first();
    const order = last ? last.order + 1 : 1;
    return await ctx.db.insert("menuItems", {
      name: args.name,
      note: args.note,
      struck: false,
      order,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("menuItems"),
    name: v.string(),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { name: args.name, note: args.note });
  },
});

export const toggleStrike = mutation({
  args: {
    id: v.id("menuItems"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) return;
    await ctx.db.patch(args.id, { struck: !item.struck });
  },
});

export const remove = mutation({
  args: {
    id: v.id("menuItems"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const move = mutation({
  args: {
    id: v.id("menuItems"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db.query("menuItems").withIndex("by_order").collect();
    const index = items.findIndex((item) => item._id === args.id);
    if (index === -1) return;
    const targetIndex = args.direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const current = items[index];
    const target = items[targetIndex];
    await ctx.db.patch(current._id, { order: target.order });
    await ctx.db.patch(target._id, { order: current.order });
  },
});

export const reorder = mutation({
  args: {
    orderedIds: v.array(v.id("menuItems")),
  },
  handler: async (ctx, args) => {
    await Promise.all(
      args.orderedIds.map((id, index) => ctx.db.patch(id, { order: index + 1 }))
    );
  },
});

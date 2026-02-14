"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  DragEndEvent,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery } from "convex/react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";

type MenuItem = Doc<"menuItems">;

type SortableRowProps = {
  item: MenuItem;
  index: number;
  onEdit: (item: MenuItem) => void;
  onToggleStrike: (id: Id<"menuItems">) => void;
  onRemove: (id: Id<"menuItems">) => void;
};

function SortableRow({ item, index, onEdit, onToggleStrike, onRemove }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={isDragging ? "bg-pink-50 shadow-sm" : "hover:bg-pink-50/60"}
    >
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-pink-200 text-xs font-semibold text-pink-600 transition hover:border-pink-300 hover:bg-pink-50 active:cursor-grabbing"
            aria-label="Kéo để sắp thứ tự"
            {...attributes}
            {...listeners}
          >
            ⋮⋮
          </button>
          <span className="inline-flex min-w-[44px] items-center justify-center rounded-full bg-pink-100 px-2 py-1 text-xs font-semibold text-pink-700">
            #{index + 1}
          </span>
        </div>
      </td>
      <td
        className={`px-3 py-3 font-medium ${
          item.struck ? "text-zinc-400 line-through" : "text-zinc-900"
        }`}
      >
        {item.name}
      </td>
      <td
        className={`px-3 py-3 ${
          item.struck ? "text-zinc-400 line-through" : "text-zinc-600"
        }`}
      >
        {item.note || "-"}
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-pink-200 px-2 py-1 text-xs font-semibold text-pink-700 transition hover:border-pink-300"
            onClick={() => onEdit(item)}
          >
            Sửa
          </button>
          <button
            type="button"
            className="rounded-md border border-pink-200 px-2 py-1 text-xs font-semibold text-pink-700 transition hover:border-pink-300"
            onClick={() => onToggleStrike(item._id)}
          >
            {item.struck ? "Bỏ gạch" : "Gạch"}
          </button>
          <button
            type="button"
            className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:border-red-300"
            onClick={() => onRemove(item._id)}
          >
            Xóa
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function Home() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<Id<"menuItems"> | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingNote, setEditingNote] = useState("");

  const items = useQuery(api.menu.list);
  const createItem = useMutation(api.menu.create);
  const updateItem = useMutation(api.menu.update);
  const removeItemMutation = useMutation(api.menu.remove);
  const toggleStrikeMutation = useMutation(api.menu.toggleStrike);
  const reorderMutation = useMutation(api.menu.reorder);

  const menuItems = items ?? [];
  const isLoading = items === undefined;

  const openAdd = () => setIsAddOpen(true);

  const closeAdd = () => {
    setIsAddOpen(false);
    setNewName("");
    setNewNote("");
  };

  const handleAdd = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    await createItem({ name, note: newNote.trim() });
    closeAdd();
  };

  const startEdit = (item: MenuItem) => {
    setEditingId(item._id);
    setEditingName(item.name);
    setEditingNote(item.note);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
    setEditingNote("");
  };

  const saveEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId) return;
    const name = editingName.trim();
    if (!name) return;
    await updateItem({
      id: editingId,
      name,
      note: editingNote.trim(),
    });
    cancelEdit();
  };

  const removeItem = (id: Id<"menuItems">) => {
    void removeItemMutation({ id });
    if (editingId === id) cancelEdit();
  };

  const toggleStrike = (id: Id<"menuItems">) => {
    void toggleStrikeMutation({ id });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = menuItems.findIndex((item) => item._id === active.id);
    const newIndex = menuItems.findIndex((item) => item._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const ordered = arrayMove(menuItems, oldIndex, newIndex);
    void reorderMutation({ orderedIds: ordered.map((item) => item._id) });
  };

  return (
    <div className="min-h-screen bg-pink-50 px-4 py-8 text-zinc-900 sm:px-6">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-2 rounded-2xl border border-pink-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Thực đơn của Vy</h1>
            <p className="text-sm text-zinc-500">
              Thêm, sửa, xóa, gạch món dự kiến xóa và kéo thả để sắp thứ tự ưu tiên.
            </p>
          </div>
          <span className="text-sm font-semibold text-pink-700">
            Tổng: {menuItems.length} món
          </span>
        </header>

        {editingId ? (
          <section className="rounded-2xl border border-pink-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Chỉnh sửa món</h2>
              <button
                type="button"
                className="text-xs font-semibold text-pink-600 hover:text-pink-700"
                onClick={cancelEdit}
              >
                Hủy chỉnh sửa
              </button>
            </div>
            <form
              className="mt-4 grid gap-3 sm:grid-cols-[2fr,2fr,auto] sm:items-end"
              onSubmit={saveEdit}
            >
              <div className="grid gap-1">
                <label className="text-xs font-medium text-zinc-600" htmlFor="edit-name">
                  Tên món
                </label>
                <input
                  id="edit-name"
                  className="h-10 rounded-lg border border-pink-200 px-3 text-sm outline-none focus:border-pink-400"
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-medium text-zinc-600" htmlFor="edit-note">
                  Ghi chú
                </label>
                <input
                  id="edit-note"
                  className="h-10 rounded-lg border border-pink-200 px-3 text-sm outline-none focus:border-pink-400"
                  value={editingNote}
                  onChange={(event) => setEditingNote(event.target.value)}
                />
              </div>
              <button
                type="submit"
                className="h-10 rounded-lg bg-pink-600 px-4 text-sm font-semibold text-white transition hover:bg-pink-500"
              >
                Lưu
              </button>
            </form>
          </section>
        ) : null}

        <section className="rounded-2xl border border-pink-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold">Danh sách món</h2>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-pink-200 text-sm font-semibold text-pink-700 transition hover:border-pink-300 hover:bg-pink-50"
                onClick={openAdd}
                aria-label="Thêm món"
              >
                +
              </button>
            </div>
            <span className="text-xs text-pink-600">Kéo thả để đổi thứ tự</span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <table className="min-w-full text-sm">
                <thead className="border-b border-pink-200 text-xs uppercase tracking-wide text-pink-600">
                  <tr className="text-left">
                    <th className="px-3 py-2">Ưu tiên</th>
                    <th className="px-3 py-2">Tên món</th>
                    <th className="px-3 py-2">Ghi chú</th>
                    <th className="px-3 py-2 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-100">
                  {isLoading ? (
                    <tr>
                      <td
                        className="px-3 py-8 text-center text-sm text-pink-600"
                        colSpan={4}
                      >
                        Đang tải dữ liệu...
                      </td>
                    </tr>
                  ) : menuItems.length === 0 ? (
                    <tr>
                      <td
                        className="px-3 py-8 text-center text-sm text-pink-600"
                        colSpan={4}
                      >
                        Chưa có món nào. Nhấn dấu + để thêm món mới.
                      </td>
                    </tr>
                  ) : (
                    <SortableContext
                      items={menuItems.map((item) => item._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {menuItems.map((item, index) => (
                        <SortableRow
                          key={item._id}
                          item={item}
                          index={index}
                          onEdit={startEdit}
                          onToggleStrike={toggleStrike}
                          onRemove={removeItem}
                        />
                      ))}
                    </SortableContext>
                  )}
                </tbody>
              </table>
            </DndContext>
          </div>
        </section>
      </main>
      {isAddOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Thêm món mới</h3>
              <button
                type="button"
                className="text-sm font-semibold text-pink-600 hover:text-pink-700"
                onClick={closeAdd}
              >
                Đóng
              </button>
            </div>
            <form className="mt-4 grid gap-3" onSubmit={handleAdd}>
              <div className="grid gap-1">
                <label className="text-xs font-medium text-zinc-600" htmlFor="add-name">
                  Tên món
                </label>
                <input
                  id="add-name"
                  className="h-10 rounded-lg border border-pink-200 px-3 text-sm outline-none focus:border-pink-400"
                  placeholder="Ví dụ: Bún bò"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-medium text-zinc-600" htmlFor="add-note">
                  Ghi chú
                </label>
                <input
                  id="add-note"
                  className="h-10 rounded-lg border border-pink-200 px-3 text-sm outline-none focus:border-pink-400"
                  placeholder="Ví dụ: Ít cay"
                  value={newNote}
                  onChange={(event) => setNewNote(event.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="h-10 flex-1 rounded-lg bg-pink-600 text-sm font-semibold text-white transition hover:bg-pink-500"
                >
                  Thêm
                </button>
                <button
                  type="button"
                  className="h-10 flex-1 rounded-lg border border-pink-200 text-sm font-semibold text-pink-700 transition hover:border-pink-300"
                  onClick={closeAdd}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

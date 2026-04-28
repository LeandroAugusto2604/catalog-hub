import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Pencil, Plus, Trash2, Loader2, ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/cart";

export const Route = createFileRoute("/admin/")({
  component: ProductsAdmin,
});

const MAX_IMAGES = 5;

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  image_urls: string[] | null;
  category_id: string | null;
  active: boolean;
}
interface Category {
  id: string;
  name: string;
}

interface EditingState {
  id: string;
  name: string;
  description: string;
  price: string;
  image_urls: string[];
  category_id: string;
  active: boolean;
}

const empty: EditingState = {
  id: "",
  name: "",
  description: "",
  price: "",
  image_urls: [],
  category_id: "",
  active: true,
};

function ProductsAdmin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EditingState>(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [newCat, setNewCat] = useState("");

  const load = async () => {
    setLoading(true);
    const [p, c] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("id,name").order("name"),
    ]);
    setProducts((p.data as Product[]) ?? []);
    setCategories(c.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(empty);
    setOpen(true);
  };
  const openEdit = (p: Product) => {
    const urls = p.image_urls && p.image_urls.length > 0
      ? p.image_urls
      : p.image_url ? [p.image_url] : [];
    setEditing({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      price: String(p.price),
      image_urls: urls,
      category_id: p.category_id ?? "",
      active: p.active,
    });
    setOpen(true);
  };

  const uploadFiles = async (files: FileList) => {
    const remaining = MAX_IMAGES - editing.image_urls.length;
    if (remaining <= 0) {
      toast.error(`Máximo de ${MAX_IMAGES} imagens`);
      return;
    }
    const list = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of list) {
        const ext = file.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("product-images").upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      setEditing((e) => ({ ...e, image_urls: [...e.image_urls, ...uploaded] }));
      toast.success(`${uploaded.length} imagem(ns) enviada(s)`);
    } catch (err: any) {
      toast.error(err.message ?? "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx: number) => {
    setEditing((e) => ({ ...e, image_urls: e.image_urls.filter((_, i) => i !== idx) }));
  };

  const save = async () => {
    if (!editing.name.trim() || !editing.price) {
      toast.error("Preencha nome e preço");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: editing.name.trim(),
        description: editing.description || null,
        price: Number(editing.price),
        image_url: editing.image_urls[0] ?? null,
        image_urls: editing.image_urls,
        category_id: editing.category_id || null,
        active: editing.active,
      };
      if (editing.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Produto atualizado");
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        toast.success("Produto criado");
      }
      setOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    load();
  };

  const addCategory = async () => {
    if (!newCat.trim()) return;
    const slug = newCat.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
    const { error } = await supabase.from("categories").insert({ name: newCat.trim(), slug });
    if (error) return toast.error(error.message);
    setNewCat("");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-sm text-muted-foreground">Gerencie o catálogo</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="btn-glow border-0">
              <Plus className="h-4 w-4 mr-2" /> Novo produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing.id ? "Editar produto" : "Novo produto"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Textarea
                  rows={3}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Preço (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.price}
                    onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select
                    value={editing.category_id || undefined}
                    onValueChange={(v) => setEditing({ ...editing, category_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Imagens (até {MAX_IMAGES})</Label>
                <div className="grid grid-cols-5 gap-2">
                  {editing.image_urls.map((url, idx) => (
                    <div
                      key={url + idx}
                      className="relative aspect-square rounded-lg bg-muted overflow-hidden group"
                    >
                      <img src={url} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 text-[9px] px-1 py-0.5 rounded bg-primary text-primary-foreground font-semibold">
                          CAPA
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {editing.image_urls.length < MAX_IMAGES && (
                    <label className="cursor-pointer aspect-square rounded-lg border-2 border-dashed border-border bg-muted/30 hover:bg-muted flex flex-col items-center justify-center gap-1 text-muted-foreground text-[10px]">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            uploadFiles(e.target.files);
                            e.target.value = "";
                          }
                        }}
                      />
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <ImageIcon className="h-4 w-4" />
                          <span>Adicionar</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  A primeira imagem será usada como capa. {editing.image_urls.length}/{MAX_IMAGES}
                </p>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Ativo no catálogo</p>
                  <p className="text-xs text-muted-foreground">Visível para clientes</p>
                </div>
                <Switch
                  checked={editing.active}
                  onCheckedChange={(v) => setEditing({ ...editing, active: v })}
                />
              </div>
              <Button onClick={save} disabled={saving} className="w-full btn-glow border-0">
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Categorias */}
      <div className="card-elevated rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3">Categorias</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.map((c) => (
            <span
              key={c.id}
              className="px-3 py-1 text-xs rounded-full bg-muted border border-border"
            >
              {c.name}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Nova categoria"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            className="max-w-xs"
          />
          <Button variant="outline" size="sm" onClick={addCategory}>
            Adicionar
          </Button>
        </div>
      </div>

      {/* Lista produtos */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum produto. Clique em "Novo produto".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((p) => {
            const cover = p.image_urls?.[0] ?? p.image_url;
            const count = p.image_urls?.length ?? (p.image_url ? 1 : 0);
            return (
              <div key={p.id} className="card-elevated rounded-xl p-3 flex gap-3">
                <div className="h-20 w-20 rounded-lg bg-muted overflow-hidden flex-shrink-0 relative">
                  {cover ? (
                    <img src={cover} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  {count > 1 && (
                    <span className="absolute bottom-1 right-1 text-[9px] px-1 py-0.5 rounded bg-black/70 text-white font-semibold">
                      +{count - 1}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium line-clamp-1">{p.name}</p>
                    {!p.active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        OFF
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-primary font-semibold">{formatBRL(Number(p.price))}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)} className="h-7">
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => del(p.id)}
                      className="h-7 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

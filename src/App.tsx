import React, { useState, useEffect } from 'react';
import { Package, AlertCircle, Plus, Search, ChevronDown, Filter, Trash2, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { InventoryItem, InventoryItemInput } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);

  // Form State
  const [formData, setFormData] = useState<InventoryItemInput>({
    name: '',
    quantity: 0,
    min_quantity: 0,
    category: 'Geral'
  });

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar itens');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('inventory_items')
          .update(formData)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('inventory_items')
          .insert([formData]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({ name: '', quantity: 0, min_quantity: 0, category: 'Geral' });
      fetchItems();
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;
    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchItems();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  }

  const criticalItems = items.filter(item => item.quantity < item.min_quantity);
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const isCritical = item.quantity < item.min_quantity;
    return matchesSearch && (!showCriticalOnly || isCritical);
  });

  const isConfigured = !import.meta.env.VITE_SUPABASE_URL?.includes('placeholder');

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 flex flex-col flex-shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white">
            <Package size={20} />
          </div>
          <span className="text-white font-bold tracking-tight text-lg">StockMaster</span>
        </div>

        <nav className="mt-4 flex-1">
          <button 
            onClick={() => setShowCriticalOnly(false)}
            className={cn(
              "w-full flex items-center gap-3 px-6 py-3 transition-colors",
              !showCriticalOnly ? "text-slate-300 bg-slate-800 border-l-4 border-blue-500" : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <Package size={18} />
            <span className="font-medium">Inventário Geral</span>
          </button>
          <button 
            onClick={() => setShowCriticalOnly(true)}
            className={cn(
              "w-full flex items-center gap-3 px-6 py-3 transition-colors",
              showCriticalOnly ? "text-slate-300 bg-slate-800 border-l-4 border-blue-500" : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <AlertCircle size={18} />
            <span className="font-medium">Relatório Crítico</span>
            {criticalItems.length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 rounded-full font-bold">
                {criticalItems.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => {
              setEditingItem(null);
              setFormData({ name: '', quantity: 0, min_quantity: 0, category: 'Geral' });
              setIsModalOpen(true);
            }}
            className="w-full flex items-center gap-3 px-6 py-3 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Plus size={18} />
            <span className="font-medium">Novo Cadastro</span>
          </button>
        </nav>

        <div className="p-6 mt-auto">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("w-2 h-2 rounded-full", isConfigured ? "bg-emerald-400" : "bg-amber-400")}></div>
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                {isConfigured ? 'Supabase Linked' : 'No Connection'}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono break-all truncate">
              {isConfigured ? (import.meta.env.VITE_SUPABASE_URL || '').replace('https://', '') : 'Configure keys in secrets'}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0">
          <h1 className="text-xl font-bold text-slate-800">Gerenciamento de Estoque</h1>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setEditingItem(null);
                setFormData({ name: '', quantity: 0, min_quantity: 0, category: 'Geral' });
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold shadow-sm hover:bg-blue-700 transition-colors"
            >
              + Adicionar Item
            </button>
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-slate-100 flex items-center justify-center text-slate-500">
              <Package size={20} />
            </div>
          </div>
        </header>

        <div className="p-8 flex-1 overflow-y-auto space-y-8">
          {!isConfigured && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3 text-amber-800">
              <AlertCircle className="shrink-0" />
              <div>
                <p className="font-medium">Configuração Necessária</p>
                <p className="text-sm">Por favor, insira as credenciais do Supabase nos Secrets para ativar o banco de dados.</p>
              </div>
            </div>
          )}

          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">Total SKU Registry</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold text-slate-900">{items.length}</span>
                <span className="text-slate-400 text-xs font-medium uppercase">itens</span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">Critical Threshold Alert</p>
              <div className="flex items-center gap-3 mt-1">
                <span className={cn("text-3xl font-bold", criticalItems.length > 0 ? "text-red-600" : "text-slate-900")}>
                  {criticalItems.length}
                </span>
                {criticalItems.length > 0 && (
                  <span className="text-[10px] font-bold uppercase bg-red-100 text-red-600 px-2 py-0.5 rounded tracking-wider">Requires Action</span>
                )}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">Supabase Sync Status</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-bold text-slate-900">Active</span>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              </div>
            </motion.div>
          </div>

          {/* Main Table Container */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <h3 className="font-bold text-slate-700">Current Stock List</h3>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search items..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-sm pl-9 pr-3 py-2 border rounded-md border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
                <button 
                  onClick={() => setShowCriticalOnly(!showCriticalOnly)}
                  className={cn(
                    "px-3 py-2 text-sm border rounded-md transition-colors font-medium flex items-center gap-2 whitespace-nowrap",
                    showCriticalOnly ? "bg-red-50 border-red-200 text-red-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Filter size={14} />
                  {showCriticalOnly ? "Críticos" : "Filtro"}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Item Name</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3 text-center">Current Qty</th>
                    <th className="px-6 py-3 text-center">Min Average</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 italic">
                  <AnimatePresence mode="popLayout">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm animate-pulse">Sincronizando registros...</td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">Nenhum registro encontrado.</td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => {
                        const isCritical = item.quantity < item.min_quantity;
                        return (
                          <motion.tr 
                            key={item.id}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={cn(
                              "hover:bg-slate-50/50 transition-colors group",
                              isCritical && "bg-red-50/20"
                            )}
                          >
                            <td className="px-6 py-4 font-medium text-slate-900 text-sm">{item.name}</td>
                            <td className="px-6 py-4 text-slate-500 text-sm">{item.category || 'Geral'}</td>
                            <td className={cn("px-6 py-4 text-center font-mono text-sm", isCritical ? "text-red-600 font-bold" : "text-slate-900")}>
                              {item.quantity}
                            </td>
                            <td className="px-6 py-4 text-center text-slate-400 font-mono text-sm">{item.min_quantity}</td>
                            <td className="px-6 py-4">
                              {isCritical ? (
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded flex items-center gap-1 w-fit">
                                  <AlertCircle size={10} /> Critical
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded flex items-center gap-1 w-fit">
                                  Healthy
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => {
                                    setEditingItem(item);
                                    setFormData({
                                      name: item.name,
                                      quantity: item.quantity,
                                      min_quantity: item.min_quantity,
                                      category: item.category || 'Geral'
                                    });
                                    setIsModalOpen(true);
                                  }}
                                  className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => deleteItem(item.id)}
                                  className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Showing {filteredItems.length} of {items.length} items</span>
              <div className="flex gap-2">
                <button className="px-3 py-1 border rounded bg-white hover:bg-slate-50 text-slate-600">Previous</button>
                <button className="px-3 py-1 border rounded bg-white hover:bg-slate-50 text-slate-600">Next</button>
              </div>
            </div>
          </div>
        </div>

        {/* Critical Alert Toast */}
        <AnimatePresence>
          {criticalItems.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 50, x: 20 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="absolute bottom-8 right-8 flex items-center gap-4 bg-slate-900 text-white p-4 rounded-lg shadow-2xl border border-slate-700 w-80 z-20"
            >
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold">{criticalItems.length} Items are Low</div>
                <div className="text-xs text-slate-400">Review critical report now.</div>
              </div>
              <button onClick={() => setShowCriticalOnly(true)} className="text-slate-500 hover:text-white">
                <Search size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modal / Sidebar Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md h-full bg-white shadow-2xl p-8 flex flex-col overflow-y-auto"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                  {editingItem ? 'Editar Registro' : 'Novo Cadastro'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">Preencha os dados técnicos do inventário.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 flex-1">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Nome do Item</label>
                  <input 
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Parafuso Sextavado M8"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Categoria</label>
                  <input 
                    type="text"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    placeholder="Ex: Fixadores, Eletrônicos..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Qtd. Atual</label>
                    <input 
                      type="number"
                      required
                      min="0"
                      value={formData.quantity}
                      onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Média Mínima</label>
                    <input 
                      type="number"
                      required
                      min="0"
                      value={formData.min_quantity}
                      onChange={e => setFormData({...formData, min_quantity: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex gap-3 mt-auto">
                  <button 
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-3 rounded-md font-bold hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    {editingItem ? 'Salvar Alteração' : 'Efetuar Cadastro'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 bg-white text-slate-600 border border-slate-200 rounded-md font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  LayoutGrid, 
  List, 
} from 'lucide-react';

// --- Types ---
type CaseStatus = 'Open' | 'Closed' | 'Under Review';

interface CaseData {
  id: string;
  name: string;
  status: CaseStatus;
  createdDate: string;
  investigator: string;
}

// --- Mock Data ---
const INITIAL_CASES: CaseData[] = [
  { id: 'CASE-2026-0039', name: 'Ransomware Variant X', status: 'Closed', createdDate: '2026-01-28', investigator: 'Sarah Jenkins' },
  { id: 'CASE-2026-0041', name: 'Downtown Data Breach', status: 'Open', createdDate: '2026-02-10', investigator: 'Alex Chen' },
  { id: 'CASE-2026-0042', name: 'Operation Silk Road', status: 'Under Review', createdDate: '2026-02-14', investigator: 'Prisha' },
];

export default function CreateCaseView() {
  // --- State ---
  const [cases, setCases] = useState<CaseData[]>(INITIAL_CASES);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'All'>('All');
  
  // Controls whether we show the list or the create form
  const [isCreatingCase, setIsCreatingCase] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    investigator: '',
    description: '',
    deviceType: 'Mobile Device (iOS)'
  });

  // --- Handlers ---
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this case?')) {
      setCases(cases.filter(c => c.id !== id));
    }
  };

  const handleEdit = (id: string) => {
    alert(`Edit functionality for ${id} would open here.`);
  };

  const handleSaveNewCase = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.id || !formData.investigator) {
      alert("Please fill in the Case Identifier and Lead Investigator.");
      return;
    }

    // Create new case object
    const newCase: CaseData = {
      id: formData.id.toUpperCase(),
      name: formData.description ? formData.description.split(' ').slice(0, 4).join(' ') + '...' : 'New Investigation',
      status: 'Open',
      createdDate: new Date().toISOString().split('T')[0],
      investigator: formData.investigator
    };

    // Add to state, reset form, and switch back to list view
    setCases([newCase, ...cases]);
    setFormData({ id: '', investigator: '', description: '', deviceType: 'Mobile Device (iOS)' });
    setIsCreatingCase(false);
  };

  // --- Derived Data (Search & Filter Logic) ---
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const matchesSearch = c.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.investigator.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [cases, searchQuery, statusFilter]);

  // --- UI Helpers ---
  const getStatusColor = (status: CaseStatus) => {
    switch (status) {
      case 'Open': return 'text-emerald-700 font-medium';
      case 'Closed': return 'text-slate-600 font-medium';
      case 'Under Review': return 'text-amber-700 font-medium';
      default: return 'text-slate-600';
    }
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500 w-full">
      
      {/* Conditionally hide the Top Header / Controls if we are creating a case */}
      {!isCreatingCase && (
        <div className="w-full mb-6">
          {/* Top Section */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Case Management</h2>
                <p className="text-slate-500 text-sm mt-1">Manage, filter, and initialize forensic investigations.</p>
              </div>
              <button 
                onClick={() => setIsCreatingCase(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Create New Case
              </button>
            </div>
          </div>

          {/* Toolbar: Search, Filter, View Toggles */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex-1 w-full flex items-center gap-4">
              <div className="relative flex-1 max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search by ID, Name, or Investigator..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                />
              </div>
              <div className="relative">
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as CaseStatus | 'All')}
                  className="pl-4 pr-10 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Closed">Closed</option>
                </select>
                {/* Custom chevron for select */}
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                </div>
              </div>
            </div>

            <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
              <button 
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <List className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setViewMode('card')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'card' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 w-full overflow-auto">
        
        {/* VIEW 1: INLINE CREATE CASE FORM */}
        {isCreatingCase ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 animate-in fade-in duration-300 w-full max-w-5xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 tracking-tight">Initialize New Case</h2>
            
            <form className="space-y-6" onSubmit={handleSaveNewCase}>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Case Identifier</label>
                <input 
                  type="text" 
                  value={formData.id}
                  onChange={(e) => setFormData({...formData, id: e.target.value})}
                  placeholder="e.g. CASE-2026-0043" 
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" 
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Lead Investigator</label>
                <input 
                  type="text" 
                  value={formData.investigator}
                  onChange={(e) => setFormData({...formData, investigator: e.target.value})}
                  placeholder="Agent Name" 
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" 
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Case Description / Notes</label>
                <textarea 
                  rows={5} 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief summary of the incident..." 
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y transition-shadow"
                ></textarea>
              </div>

              <div className="space-y-2 relative">
                <label className="text-sm font-semibold text-slate-700">Seized Device Type</label>
                <select 
                  value={formData.deviceType}
                  onChange={(e) => setFormData({...formData, deviceType: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white appearance-none cursor-pointer transition-shadow"
                >
                  <option>Mobile Device (iOS)</option>
                  <option>Mobile Device (Android)</option>
                  <option>Laptop/PC</option>
                  <option>Other Media</option>
                </select>
                <div className="pointer-events-none absolute bottom-0 right-0 flex items-center h-[46px] px-3 text-slate-500">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                </div>
              </div>

              <div className="pt-6 flex items-center gap-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsCreatingCase(false)}
                  className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                  Save & Proceed
                </button>
              </div>
            </form>
          </div>

        ) : filteredCases.length === 0 ? (
          
          /* VIEW 2: EMPTY STATE */
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center flex flex-col items-center justify-center h-64">
            <Search className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-700">No cases found</h3>
            <p className="text-slate-500 text-sm mt-1">Try adjusting your search or filter criteria.</p>
          </div>

        ) : viewMode === 'table' ? (
          
          /* VIEW 3: TABLE VIEW */
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-5 font-semibold text-slate-600">Case ID</th>
                  <th className="p-5 font-semibold text-slate-600">Case Name</th>
                  <th className="p-5 font-semibold text-slate-600 text-center">Status</th>
                  <th className="p-5 font-semibold text-slate-600">Investigator</th>
                  <th className="p-5 font-semibold text-slate-600">Created Date</th>
                  <th className="p-5 font-semibold text-slate-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-5 font-medium text-blue-600">{c.id}</td>
                    <td className="p-5 font-bold text-slate-900">{c.name}</td>
                    <td className="p-5 text-center">
                      <span className={`px-3 py-1 bg-slate-100 rounded-full text-xs ${getStatusColor(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-5 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                        {c.investigator.charAt(0)}
                      </div>
                      <span className="text-slate-700 font-medium">{c.investigator}</span>
                    </td>
                    <td className="p-5 text-slate-500 font-medium">{c.createdDate}</td>
                    <td className="p-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(c.id)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        ) : (
          
          /* VIEW 4: CARD VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCases.map((c) => (
              <div key={c.id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow relative group">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 bg-slate-100 rounded-full text-xs ${getStatusColor(c.status)}`}>
                    {c.status}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(c.id)} className="p-1.5 bg-slate-100 text-slate-500 hover:text-blue-600 rounded transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 bg-slate-100 text-slate-500 hover:text-red-600 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">{c.name}</h3>
                <p className="font-medium text-sm text-blue-600 mb-6">{c.id}</p>
                <div className="flex justify-between items-end border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-1">Investigator</p>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                        {c.investigator.charAt(0)}
                      </div>
                      {c.investigator}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 font-medium mb-1">Created</p>
                    <p className="text-sm font-semibold text-slate-700">{c.createdDate}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Layers,
  MapPin,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Building,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MoveRight,
  ShieldCheck,
  User,
  Trash2,
  Edit2,
  Edit3,
  Map,
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/apiHelper';
import { showCenteredNotice, showConfirmModal } from '../components/CenteredModalNotice';
import { RouteBatchMapModal } from '../components/RouteBatchMapModal';

interface BatchLocation {
  id: string;
  name: string;
  clinic?: string;
  doctor_name?: string;
  category?: 'CLINIC' | 'HOSPITAL' | 'PHARMACY' | 'OFFICE' | 'STOCKAGE' | 'OTHER';
  phone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  created_by_name?: string;
  batch_id?: string;
  batch_code?: string;
  batch_name?: string;
}

interface RouteBatchItem {
  id: string;
  batch_code: string;
  name: string;
  description?: string;
  hq_id?: string;
  hq_name?: string;
  mr_id?: string;
  mr_name?: string;
  distance_km: number;
  route_stops: string[];
  location_ids?: string[];
  locations?: BatchLocation[];
  locations_count?: number;
  standard_reimbursement_rate?: number;
  created_at?: string;
}

export const BatchLocationsView: React.FC = () => {
  const [batches, setBatches] = useState<RouteBatchItem[]>([]);
  const [allLocations, setAllLocations] = useState<BatchLocation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedHqFilter, setSelectedHqFilter] = useState<string>('ALL');
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

  // Modal for assigning a location to batch
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [assigningBatch, setAssigningBatch] = useState<RouteBatchItem | null>(null);
  const [selectedLocationToAssign, setSelectedLocationToAssign] = useState<string>('');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState<boolean>(false);

  // Modal for creating new batch
  const [isCreateBatchModalOpen, setIsCreateBatchModalOpen] = useState<boolean>(false);
  const [newBatchCode, setNewBatchCode] = useState<string>('');
  const [newBatchName, setNewBatchName] = useState<string>('');
  const [newBatchDistance, setNewBatchDistance] = useState<string>('40');
  const [newBatchRate, setNewBatchRate] = useState<string>('2.25');
  const [newBatchStops, setNewBatchStops] = useState<string>('Shahdol, Manpur');
  const [newBatchHq, setNewBatchHq] = useState<string>('hq-shahdol');

  // Modal for editing batch reimbursement rate
  const [isEditRateModalOpen, setIsEditRateModalOpen] = useState<boolean>(false);
  const [editingRateBatch, setEditingRateBatch] = useState<RouteBatchItem | null>(null);
  const [editRateInput, setEditRateInput] = useState<string>('');
  const [isSavingBatchRate, setIsSavingBatchRate] = useState<boolean>(false);

  // Modal for editing entire batch
  const [isEditBatchModalOpen, setIsEditBatchModalOpen] = useState<boolean>(false);
  const [editingBatch, setEditingBatch] = useState<RouteBatchItem | null>(null);
  const [editBatchCode, setEditBatchCode] = useState<string>('');
  const [editBatchName, setEditBatchName] = useState<string>('');
  const [editBatchDistance, setEditBatchDistance] = useState<string>('40');
  const [editBatchRate, setEditBatchRate] = useState<string>('2.25');
  const [editBatchStops, setEditBatchStops] = useState<string>('');
  const [editBatchHq, setEditBatchHq] = useState<string>('hq-shahdol');
  const [isSavingBatch, setIsSavingBatch] = useState<boolean>(false);

  // Modal for Interactive Map Route Picker
  const [isMapRouteModalOpen, setIsMapRouteModalOpen] = useState<boolean>(false);
  const [mapRouteTarget, setMapRouteTarget] = useState<'CREATE' | 'EDIT'>('CREATE');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem('ahtri_auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 1. Fetch batches with locations
      const batchRes = await fetch(`${baseUrl}/territories/route-batches/with-locations`, { headers });
      let batchData: RouteBatchItem[] = [];
      if (batchRes.ok) {
        batchData = await batchRes.json();
      }

      // 2. Fetch all saved locations
      const locRes = await fetch(`${baseUrl}/locations`, { headers });
      let locData: BatchLocation[] = [];
      if (locRes.ok) {
        locData = await locRes.json();
      }

      setBatches(Array.isArray(batchData) ? batchData : []);
      setAllLocations(Array.isArray(locData) ? locData : []);
      if (batchData.length > 0 && !expandedBatchId) {
        setExpandedBatchId(batchData[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load batch locations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAssignModal = (batch: RouteBatchItem) => {
    setAssigningBatch(batch);
    setSelectedLocationToAssign('');
    setIsAssignModalOpen(true);
  };

  const handleConfirmAssign = async () => {
    if (!assigningBatch || !selectedLocationToAssign) {
      showCenteredNotice({
        title: 'Selection Required',
        message: 'Please choose a location to assign to this route batch.',
        type: 'warning',
      });
      return;
    }

    setIsSubmittingAssign(true);
    try {
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem('ahtri_auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}/territories/route-batches/${assigningBatch.id}/assign-location`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          location_id: selectedLocationToAssign,
          action: 'ASSIGN',
        }),
      });

      if (res.ok) {
        showCenteredNotice({
          title: 'Location Assigned',
          message: `Location successfully linked to route batch [${assigningBatch.batch_code}] ${assigningBatch.name}.`,
          type: 'success',
        });
        setIsAssignModalOpen(false);
        window.dispatchEvent(new CustomEvent('ahtri_batch_updated', { detail: { batchId: assigningBatch.id, locationId: selectedLocationToAssign, action: 'ASSIGN' } }));
        window.dispatchEvent(new CustomEvent('ahtri_tp_updated'));
        window.dispatchEvent(new CustomEvent('ahtri_data_updated', { detail: { type: 'BATCH_ASSIGN' } }));
        fetchData();
      } else {
        throw new Error('Server returned an error');
      }
    } catch (err: any) {
      showCenteredNotice({
        title: 'Assignment Failed',
        message: err.message || 'Could not link location to route batch.',
        type: 'error',
      });
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const handleRemoveLocationFromBatch = async (batchId: string, locationId: string, locationName: string) => {
    const confirmed = await showConfirmModal({
      title: 'Unlink Location',
      message: `Are you sure you want to unlink "${locationName}" from this route batch circuit?`,
      type: 'warning',
      isDestructive: true,
      confirmText: 'Unlink Location',
      cancelText: 'Cancel',
    });
    if (!confirmed) return;

    // Optimistically update batches and allLocations immediately in UI
    setBatches((prevBatches) =>
      prevBatches.map((b) => {
        if (b.id === batchId || b.batch_code === batchId) {
          const updatedLocations = (b.locations || []).filter((l) => l.id !== locationId);
          const updatedIds = (b.location_ids || []).filter((id) => id !== locationId);
          return {
            ...b,
            locations: updatedLocations,
            location_ids: updatedIds,
            locations_count: updatedLocations.length,
          };
        }
        return b;
      })
    );
    setAllLocations((prevLocs) =>
      prevLocs.map((l) =>
        l.id === locationId
          ? { ...l, batch_id: undefined, batch_code: undefined, batch_name: undefined }
          : l
      )
    );

    try {
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem('ahtri_auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}/territories/route-batches/${batchId}/assign-location`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          location_id: locationId,
          action: 'REMOVE',
        }),
      });

      if (res.ok) {
        showCenteredNotice({
          title: 'Location Unlinked',
          message: `"${locationName}" removed from route batch.`,
          type: 'info',
        });
        window.dispatchEvent(new CustomEvent('ahtri_batch_updated', { detail: { batchId, locationId, action: 'REMOVE' } }));
        window.dispatchEvent(new CustomEvent('ahtri_tp_updated'));
        window.dispatchEvent(new CustomEvent('ahtri_data_updated', { detail: { type: 'BATCH_UNLINK' } }));
        await fetchData();
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Server error unlinking location');
      }
    } catch (err: any) {
      showCenteredNotice({
        title: 'Unlink Failed',
        message: `Error unlinking location: ${err.message}`,
        type: 'error',
      });
      fetchData();
    }
  };

  const handleCreateNewBatch = async () => {
    if (!newBatchCode.trim() || !newBatchName.trim()) {
      showCenteredNotice({
        title: 'Incomplete Details',
        message: 'Please provide both Route Batch Code (e.g. RB-SHD-05) and Name.',
        type: 'warning',
      });
      return;
    }

    try {
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem('ahtri_auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const stopsArray = newBatchStops
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(`${baseUrl}/territories/route-batches`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          batch_code: newBatchCode.trim().toUpperCase(),
          name: newBatchName.trim(),
          distance_km: Number(newBatchDistance) || 30,
          route_stops: stopsArray.length > 0 ? stopsArray : ['Shahdol', 'Area'],
          hq_id: newBatchHq,
          standard_reimbursement_rate: Number(newBatchRate) || 2.25,
        }),
      });

      if (res.ok) {
        showCenteredNotice({
          title: 'Route Batch Created',
          message: `New Route Batch [${newBatchCode.trim().toUpperCase()}] successfully configured with rate ₹${Number(newBatchRate) || 2.25}/km!`,
          type: 'success',
        });
        setIsCreateBatchModalOpen(false);
        setNewBatchCode('');
        setNewBatchName('');
        setNewBatchRate('2.25');
        window.dispatchEvent(new CustomEvent('ahtri_batch_updated'));
        window.dispatchEvent(new CustomEvent('ahtri_tp_updated'));
        window.dispatchEvent(new CustomEvent('ahtri_data_updated', { detail: { type: 'BATCH_CREATED' } }));
        fetchData();
      }
    } catch (err: any) {
      showCenteredNotice({
        title: 'Error Creating Batch',
        message: err.message,
        type: 'error',
      });
    }
  };

  const handleOpenEditRateModal = (batch: RouteBatchItem) => {
    setEditingRateBatch(batch);
    setEditRateInput(String(batch.standard_reimbursement_rate ?? 2.25));
    setIsEditRateModalOpen(true);
  };

  const handleSaveBatchRate = async () => {
    if (!editingRateBatch) return;
    const rateVal = parseFloat(editRateInput);
    if (isNaN(rateVal) || rateVal < 0) {
      showCenteredNotice({
        title: 'Invalid Rate',
        message: 'Please enter a valid reimbursement rate per kilometer (₹/km).',
        type: 'warning',
      });
      return;
    }

    setIsSavingBatchRate(true);
    try {
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem('ahtri_auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}/territories/route-batches/${editingRateBatch.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          standard_reimbursement_rate: rateVal,
        }),
      });

      if (res.ok) {
        showCenteredNotice({
          title: 'Reimbursement Rate Saved',
          message: `Standard reimbursement rate for [${editingRateBatch.batch_code}] successfully updated to ₹${rateVal}/km!`,
          type: 'success',
        });
        setIsEditRateModalOpen(false);
        window.dispatchEvent(new CustomEvent('ahtri_batch_updated', { detail: { batchId: editingRateBatch.id, rate: rateVal } }));
        window.dispatchEvent(new CustomEvent('ahtri_tp_updated'));
        window.dispatchEvent(new CustomEvent('ahtri_data_updated', { detail: { type: 'RATE_UPDATED' } }));
        fetchData();
      } else {
        throw new Error('Failed to update rate');
      }
    } catch (err: any) {
      showCenteredNotice({
        title: 'Error Saving Rate',
        message: err.message || 'Could not update batch reimbursement rate.',
        type: 'error',
      });
    } finally {
      setIsSavingBatchRate(false);
    }
  };

  const handleOpenEditBatchModal = (batch: RouteBatchItem) => {
    setEditingBatch(batch);
    setEditBatchCode(batch.batch_code);
    setEditBatchName(batch.name);
    setEditBatchDistance(String(batch.distance_km));
    setEditBatchRate(String(batch.standard_reimbursement_rate ?? 2.25));
    setEditBatchStops((batch.route_stops || []).join(', '));
    setEditBatchHq(batch.hq_id || 'hq-shahdol');
    setIsEditBatchModalOpen(true);
  };

  const handleSaveEditBatch = async () => {
    if (!editingBatch) return;
    if (!editBatchCode.trim() || !editBatchName.trim()) {
      showCenteredNotice({
        title: 'Incomplete Details',
        message: 'Please provide both Route Batch Code and Name.',
        type: 'warning',
      });
      return;
    }

    setIsSavingBatch(true);
    try {
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem('ahtri_auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const stopsArray = editBatchStops
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(`${baseUrl}/territories/route-batches/${editingBatch.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          batch_code: editBatchCode.trim().toUpperCase(),
          name: editBatchName.trim(),
          distance_km: Number(editBatchDistance) || 30,
          route_stops: stopsArray.length > 0 ? stopsArray : ['Shahdol', 'Area'],
          standard_reimbursement_rate: Number(editBatchRate) || 2.25,
          hq_id: editBatchHq,
        }),
      });

      if (res.ok) {
        showCenteredNotice({
          title: 'Route Batch Updated',
          message: `Route Batch [${editBatchCode.trim().toUpperCase()}] was successfully updated!`,
          type: 'success',
        });
        setIsEditBatchModalOpen(false);
        window.dispatchEvent(new CustomEvent('ahtri_batch_updated'));
        window.dispatchEvent(new CustomEvent('ahtri_tp_updated'));
        window.dispatchEvent(new CustomEvent('ahtri_data_updated', { detail: { type: 'BATCH_UPDATED' } }));
        await fetchData();
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to update Route Batch');
      }
    } catch (err: any) {
      showCenteredNotice({
        title: 'Update Failed',
        message: err.message || 'Could not update Route Batch details.',
        type: 'error',
      });
    } finally {
      setIsSavingBatch(false);
    }
  };

  const handleDeleteBatch = async (batch: RouteBatchItem) => {
    const confirmed = await showConfirmModal({
      title: 'Delete Route Batch',
      message: `Are you sure you want to permanently delete Route Batch [${batch.batch_code}] "${batch.name}"? This action cannot be undone.`,
      type: 'warning',
      isDestructive: true,
      confirmText: 'Delete Batch',
      cancelText: 'Cancel',
    });
    if (!confirmed) return;

    try {
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem('ahtri_auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}/territories/route-batches/${batch.id}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        showCenteredNotice({
          title: 'Route Batch Deleted',
          message: `Route Batch [${batch.batch_code}] was removed.`,
          type: 'info',
        });
        window.dispatchEvent(new CustomEvent('ahtri_batch_updated'));
        window.dispatchEvent(new CustomEvent('ahtri_tp_updated'));
        window.dispatchEvent(new CustomEvent('ahtri_data_updated', { detail: { type: 'BATCH_DELETED' } }));
        await fetchData();
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Server error deleting route batch');
      }
    } catch (err: any) {
      showCenteredNotice({
        title: 'Delete Failed',
        message: err.message || 'Could not delete Route Batch.',
        type: 'error',
      });
    }
  };

  const handleApplyRouteFromMap = (result: {
    stops: string[];
    distanceKm: number;
    suggestedBatchName: string;
  }) => {
    if (mapRouteTarget === 'CREATE') {
      setNewBatchDistance(String(result.distanceKm));
      setNewBatchStops(result.stops.join(', '));
      if (!newBatchName.trim() || newBatchName.toLowerCase().includes('circuit')) {
        setNewBatchName(result.suggestedBatchName);
      }
    } else {
      setEditBatchDistance(String(result.distanceKm));
      setEditBatchStops(result.stops.join(', '));
      if (!editBatchName.trim() || editBatchName.toLowerCase().includes('circuit')) {
        setEditBatchName(result.suggestedBatchName);
      }
    }
  };

  // Filter batches
  const filteredBatches = batches.filter((b) => {
    const matchesHq =
      selectedHqFilter === 'ALL' ||
      (b.hq_id && b.hq_id.toLowerCase().includes(selectedHqFilter.toLowerCase())) ||
      (b.hq_name && b.hq_name.toLowerCase().includes(selectedHqFilter.toLowerCase()));

    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesHq;

    const matchesBatch =
      b.batch_code.toLowerCase().includes(query) ||
      b.name.toLowerCase().includes(query) ||
      (b.route_stops && b.route_stops.some((s) => s.toLowerCase().includes(query)));

    const matchesLoc =
      b.locations &&
      b.locations.some(
        (l) =>
          l.name.toLowerCase().includes(query) ||
          (l.doctor_name && l.doctor_name.toLowerCase().includes(query)) ||
          (l.address && l.address.toLowerCase().includes(query)),
      );

    return matchesHq && (matchesBatch || matchesLoc);
  });

  // Calculate unassigned locations
  const assignedLocationIdSet = new Set<string>();
  batches.forEach((b) => {
    (b.location_ids || []).forEach((id) => assignedLocationIdSet.add(id));
    (b.locations || []).forEach((l) => assignedLocationIdSet.add(l.id));
  });

  const unassignedLocations = allLocations.filter(
    (l) => !assignedLocationIdSet.has(l.id) && !l.batch_id,
  );

  const totalAssignedCount = Array.from(assignedLocationIdSet).length;

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', color: '#0F172A' }}>
      {/* Top Banner Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                Route Batches &amp; Assigned Locations
              </h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#64748B' }}>
                Group field doctors, clinics, and medical stores under designated route circuits for automatic Tour Plan sequencing.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={fetchData}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: '#334155',
            }}
          >
            <RefreshCw size={15} className={isLoading ? 'spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setIsCreateBatchModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              backgroundColor: '#0F8B5A',
              border: 'none',
              borderRadius: '8px',
              color: '#FFFFFF',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.88rem',
              boxShadow: '0 2px 8px rgba(15, 139, 90, 0.25)',
            }}
          >
            <Plus size={16} />
            New Route Batch
          </button>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Total Route Batches
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
            {batches.length}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#0F8B5A', marginTop: '4px', fontWeight: 600 }}>
            Standard circuits configured
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Assigned Locations
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>
            {totalAssignedCount}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
            Clinics &amp; Chemists linked to batches
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Unassigned Locations
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>
            {unassignedLocations.length}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#B45309', marginTop: '4px', fontWeight: 600 }}>
            Available for batch assignment
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Total Marked Points
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F8B5A', marginTop: '4px' }}>
            {allLocations.length}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
            All field verified locations
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#FFFFFF',
          padding: '14px 18px',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
          <Search size={18} color="#94A3B8" />
          <input
            type="text"
            placeholder="Search by route batch, stops, clinic or doctor name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: '0.92rem',
              color: '#0F172A',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="#64748B" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>Headquarter:</span>
          <select
            value={selectedHqFilter}
            onChange={(e) => setSelectedHqFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#F8FAFC',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#1E293B',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Headquarters</option>
            <option value="shahdol">Shahdol HQ</option>
            <option value="kotma">Kotma HQ</option>
            <option value="ambikapur">Ambikapur HQ</option>
            <option value="bilaspur">Bilaspur HQ</option>
          </select>
        </div>
      </div>

      {/* Batches and Assigned Locations List */}
      {isLoading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
          <RefreshCw size={32} className="spin" style={{ margin: '0 auto 12px auto', color: '#2563EB' }} />
          <p style={{ fontWeight: 600 }}>Loading route batches and assigned location details...</p>
        </div>
      ) : filteredBatches.length === 0 ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '48px',
            textAlign: 'center',
            color: '#64748B',
          }}
        >
          <Layers size={40} style={{ margin: '0 auto 12px auto', color: '#94A3B8' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px 0', color: '#1E293B' }}>
            No Route Batches Found
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem' }}>
            No route batches match your current search or headquarter filter.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredBatches.map((batch) => {
            const isExpanded = expandedBatchId === batch.id;
            const batchLocations = batch.locations || [];

            return (
              <div
                key={batch.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: isExpanded ? '1px solid #93C5FD' : '1px solid #E2E8F0',
                  boxShadow: isExpanded
                    ? '0 4px 12px rgba(37, 99, 235, 0.08)'
                    : '0 1px 3px rgba(0,0,0,0.04)',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Batch Header Bar */}
                <div
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    backgroundColor: isExpanded ? '#F8FAFC' : '#FFFFFF',
                    borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => setExpandedBatchId(isExpanded ? null : batch.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#EFF6FF',
                        borderRadius: '6px',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        color: '#1D4ED8',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {batch.batch_code}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                        {batch.name}
                      </h3>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '4px',
                          fontSize: '0.82rem',
                          color: '#64748B',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>📍 HQ: {batch.hq_name || 'Shahdol'}</span>
                        <span>•</span>
                        <span>📏 {batch.distance_km} km (One-Way)</span>
                        <span>•</span>
                        <span style={{ color: '#0F8B5A', fontWeight: 700 }}>
                          🔄 {batch.distance_km * 2} km (Round-Trip)
                        </span>
                        <span>•</span>
                        <span style={{ color: '#2563EB', fontWeight: 700 }}>
                          💰 Rate: ₹{batch.standard_reimbursement_rate ?? 2.5}/km
                        </span>
                        <span>•</span>
                        <span
                          style={{
                            color: '#15803D',
                            fontWeight: 700,
                            backgroundColor: '#DCFCE7',
                            padding: '1px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          Round-Trip: ₹{((batch.distance_km * 2) * (batch.standard_reimbursement_rate ?? 2.5)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        backgroundColor: batchLocations.length > 0 ? '#DCFCE7' : '#F1F5F9',
                        color: batchLocations.length > 0 ? '#15803D' : '#64748B',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                      }}
                    >
                      {batchLocations.length} Locations
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditBatchModal(batch);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        backgroundColor: '#EFF6FF',
                        color: '#1D4ED8',
                        border: '1px solid #BFDBFE',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                      title="Edit circuit stops, distance km, and batch details"
                    >
                      <Edit3 size={13} />
                      Edit Batch
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditRateModal(batch);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        backgroundColor: '#F8FAFC',
                        color: '#334155',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                      title="Set standard reimbursement rate for this batch"
                    >
                      <Edit2 size={13} />
                      Edit Rate
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAssignModal(batch);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={14} />
                      Assign Location
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBatch(batch);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px 9px',
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        border: '1px solid #FECACA',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                      title="Delete this Route Batch"
                    >
                      <Trash2 size={13} />
                    </button>

                    <button
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748B',
                        padding: '4px',
                      }}
                    >
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>

                {/* Batch Stops Ribbon */}
                <div
                  style={{
                    padding: '8px 20px',
                    backgroundColor: '#F1F5F9',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.82rem',
                    color: '#475569',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#334155' }}>Circuit Stops:</span>
                  {(batch.route_stops || []).map((stop, sIdx) => (
                    <React.Fragment key={sIdx}>
                      <span
                        style={{
                          backgroundColor: '#FFFFFF',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: '1px solid #CBD5E1',
                          fontWeight: 600,
                          fontSize: '0.78rem',
                          color: '#0F172A',
                        }}
                      >
                        {stop}
                      </span>
                      {sIdx < (batch.route_stops?.length || 0) - 1 && (
                        <ArrowRight size={12} color="#94A3B8" />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Collapsible Locations Drawer */}
                {isExpanded && (
                  <div style={{ padding: '20px', backgroundColor: '#FFFFFF' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#334155' }}>
                        Assigned Clinics, Hospitals &amp; Pharmacies ({batchLocations.length})
                      </h4>
                      <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                        When this batch is planned in TP, these stops automatically generate in MR's daily agenda.
                      </span>
                    </div>

                    {batchLocations.length === 0 ? (
                      <div
                        style={{
                          padding: '24px',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '8px',
                          border: '1px dashed #CBD5E1',
                          textAlign: 'center',
                          color: '#64748B',
                        }}
                      >
                        <p style={{ margin: 0, fontSize: '0.88rem' }}>
                          No locations currently assigned to this route batch. Click <strong>"Assign Location"</strong> above to link verified doctor clinics and pharmacies.
                        </p>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                          gap: '14px',
                        }}
                      >
                        {batchLocations.map((loc, lIdx) => (
                          <div
                            key={loc.id || lIdx}
                            style={{
                              border: '1px solid #E2E8F0',
                              borderRadius: '8px',
                              padding: '14px',
                              backgroundColor: '#FAFAFA',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>
                                  {loc.name || loc.clinic}
                                </div>
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor:
                                      loc.category === 'HOSPITAL'
                                        ? '#FEE2E2'
                                        : loc.category === 'PHARMACY'
                                        ? '#DBEAFE'
                                        : '#DCFCE7',
                                    color:
                                      loc.category === 'HOSPITAL'
                                        ? '#B91C1C'
                                        : loc.category === 'PHARMACY'
                                        ? '#1D4ED8'
                                        : '#15803D',
                                  }}
                                >
                                  {loc.category || 'CLINIC'}
                                </span>
                              </div>

                              {loc.doctor_name && (
                                <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '4px' }}>
                                  Dr: {loc.doctor_name}
                                </div>
                              )}

                              <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
                                📍 {loc.address || 'Address unrecorded'}
                              </div>

                              {loc.latitude && loc.longitude && (
                                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px', fontFamily: 'monospace' }}>
                                  GPS: {Number(loc.latitude).toFixed(4)}, {Number(loc.longitude).toFixed(4)}
                                </div>
                              )}
                            </div>

                            <div
                              style={{
                                marginTop: '12px',
                                paddingTop: '8px',
                                borderTop: '1px solid #E2E8F0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                                Stop #{lIdx + 1} in circuit
                              </span>
                              <button
                                onClick={() => handleRemoveLocationFromBatch(batch.id, loc.id, loc.name || 'Location')}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: 'none',
                                  border: 'none',
                                  color: '#DC2626',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                <Trash2 size={13} />
                                Unlink
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Assign Location to Route Batch */}
      {isAssignModalOpen && assigningBatch && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
          >
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
              Assign Location to Route Batch
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748B' }}>
              Linking to: <strong>[{assigningBatch.batch_code}] {assigningBatch.name}</strong>
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Select Marked Clinic, Hospital, or Chemist:
              </label>
              <select
                value={selectedLocationToAssign}
                onChange={(e) => setSelectedLocationToAssign(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.9rem',
                  color: '#0F172A',
                }}
              >
                <option value="">-- Choose a location --</option>
                {allLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name || loc.clinic} ({loc.category || 'CLINIC'}) — {loc.address || 'Field'}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                disabled={isSubmittingAssign}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  color: '#475569',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAssign}
                disabled={isSubmittingAssign}
                style={{
                  padding: '8px 18px',
                  backgroundColor: '#0F8B5A',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                {isSubmittingAssign ? 'Saving...' : 'Link to Batch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Route Batch */}
      {isCreateBatchModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
              Create New Route Batch
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748B' }}>
              Define a new standard travel circuit for Field MRs.
            </p>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Batch Code *
              </label>
              <input
                type="text"
                placeholder="e.g. RB-SHD-05"
                value={newBatchCode}
                onChange={(e) => setNewBatchCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.88rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Batch Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Shahdol - Manpur Circuit"
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.88rem',
                }}
              />
            </div>

            {/* Interactive Map Route Planner Callout */}
            <div
              style={{
                marginBottom: '14px',
                padding: '10px 14px',
                backgroundColor: '#EFF6FF',
                borderRadius: '8px',
                border: '1px dashed #93C5FD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1E40AF' }}>
                  🗺️ Pick Route &amp; Auto-Calculate Km
                </div>
                <div style={{ fontSize: '0.74rem', color: '#3B82F6', marginTop: '2px' }}>
                  Select starting city &amp; final destination on map to compute one-way km.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMapRouteTarget('CREATE');
                  setIsMapRouteModalOpen(true);
                }}
                style={{
                  padding: '7px 12px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                }}
              >
                <Map size={14} />
                Open Map
              </button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                One-Way Distance (km) *
              </label>
              <input
                type="number"
                value={newBatchDistance}
                onChange={(e) => setNewBatchDistance(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.88rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Standard Reimbursement Rate (₹/km) *
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="2.5"
                value={newBatchRate}
                onChange={(e) => setNewBatchRate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.88rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Route Stops (comma-separated) *
              </label>
              <input
                type="text"
                placeholder="Shahdol, Singhpur, Manpur"
                value={newBatchStops}
                onChange={(e) => setNewBatchStops(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.88rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setIsCreateBatchModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  color: '#475569',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewBatch}
                style={{
                  padding: '8px 18px',
                  backgroundColor: '#0F8B5A',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                Create Circuit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Route Batch */}
      {isEditBatchModalOpen && editingBatch && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '540px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
              Edit Route Batch Circuit
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748B' }}>
              Modify circuit code, name, stops, and distance for <strong>[{editingBatch.batch_code}] {editingBatch.name}</strong>.
            </p>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Batch Code *
              </label>
              <input
                type="text"
                value={editBatchCode}
                onChange={(e) => setEditBatchCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Batch Name *
              </label>
              <input
                type="text"
                value={editBatchName}
                onChange={(e) => setEditBatchName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.88rem',
                }}
              />
            </div>

            {/* Interactive Map Route Planner Callout for Editing */}
            <div
              style={{
                marginBottom: '14px',
                padding: '10px 14px',
                backgroundColor: '#EFF6FF',
                borderRadius: '8px',
                border: '1px dashed #93C5FD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1E40AF' }}>
                  🗺️ Recalculate on Interactive Map
                </div>
                <div style={{ fontSize: '0.74rem', color: '#3B82F6', marginTop: '2px' }}>
                  Pick stops and re-calculate actual road distance automatically.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMapRouteTarget('EDIT');
                  setIsMapRouteModalOpen(true);
                }}
                style={{
                  padding: '7px 12px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                }}
              >
                <Map size={14} />
                Open Map
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  One-Way Distance (km) *
                </label>
                <input
                  type="number"
                  value={editBatchDistance}
                  onChange={(e) => setEditBatchDistance(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Rate (₹/km) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editBatchRate}
                  onChange={(e) => setEditBatchRate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Route Stops (comma-separated) *
              </label>
              <input
                type="text"
                placeholder="Shahdol, Budhar, Dhanpuri, Manpur"
                value={editBatchStops}
                onChange={(e) => setEditBatchStops(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.88rem',
                }}
              />
            </div>

            {/* Travel Reimbursement Estimate Banner */}
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 12px',
                backgroundColor: '#F8FAFC',
                borderRadius: '8px',
                fontSize: '0.82rem',
                color: '#64748B',
                border: '1px solid #E2E8F0',
              }}
            >
              <div>Round-Trip Distance: <strong>{(Number(editBatchDistance) || 0) * 2} km</strong></div>
              <div style={{ marginTop: '3px' }}>
                Total Reimbursement per visit:{' '}
                <strong style={{ color: '#0F8B5A' }}>
                  ₹{(((Number(editBatchDistance) || 0) * 2) * (Number(editBatchRate) || 0)).toFixed(2)}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsEditBatchModalOpen(false)}
                disabled={isSavingBatch}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  color: '#475569',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditBatch}
                disabled={isSavingBatch}
                style={{
                  padding: '8px 18px',
                  backgroundColor: '#2563EB',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                {isSavingBatch ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Batch Reimbursement Rate */}
      {isEditRateModalOpen && editingRateBatch && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
              Set Reimbursement Rate
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748B' }}>
              Configure standard travel reimbursement rate per kilometer for <strong>[{editingRateBatch.batch_code}] {editingRateBatch.name}</strong>.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Reimbursement Rate (₹/km)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={editRateInput}
                onChange={(e) => setEditRateInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#0F172A',
                }}
              />
              <div style={{ marginTop: '10px', padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: '6px', fontSize: '0.82rem', color: '#64748B' }}>
                <div>Round-Trip Distance: <strong>{editingRateBatch.distance_km * 2} km</strong></div>
                <div style={{ marginTop: '4px' }}>
                  Total Estimated Reimbursement:{' '}
                  <strong style={{ color: '#0F8B5A' }}>
                    ₹{((editingRateBatch.distance_km * 2) * (parseFloat(editRateInput) || 0)).toFixed(2)}
                  </strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setIsEditRateModalOpen(false)}
                disabled={isSavingBatchRate}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  color: '#475569',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBatchRate}
                disabled={isSavingBatchRate}
                style={{
                  padding: '8px 18px',
                  backgroundColor: '#0F8B5A',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                {isSavingBatchRate ? 'Saving...' : 'Save Rate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Map Route & Distance Builder Modal */}
      <RouteBatchMapModal
        isOpen={isMapRouteModalOpen}
        onClose={() => setIsMapRouteModalOpen(false)}
        initialStops={
          mapRouteTarget === 'CREATE'
            ? newBatchStops.split(',').map((s) => s.trim()).filter(Boolean)
            : editBatchStops.split(',').map((s) => s.trim()).filter(Boolean)
        }
        initialDistanceKm={
          mapRouteTarget === 'CREATE' ? Number(newBatchDistance) || 0 : Number(editBatchDistance) || 0
        }
        ratePerKm={
          mapRouteTarget === 'CREATE' ? Number(newBatchRate) || 2.25 : Number(editBatchRate) || 2.25
        }
        allSavedLocations={allLocations}
        onApplyRoute={handleApplyRouteFromMap}
      />
    </div>
  );
};

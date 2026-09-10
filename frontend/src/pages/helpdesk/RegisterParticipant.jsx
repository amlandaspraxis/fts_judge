import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { UserPlus, CheckCircle2, AlertCircle, Phone, Tag, Hash, FileText, ArrowRight, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RegisterParticipant() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [routineTitle, setRoutineTitle] = useState('');
  const [participantCode, setParticipantCode] = useState('');

  const [registeredPerformer, setRegisteredPerformer] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/admin/categories').then(res => {
      const cats = res.data.categories || [];
      setCategories(cats);
      if (cats.length > 0) {
        setCategoryId(cats[0].id);
      }
    }).catch(err => {
      setError('Failed to load categories: ' + (err.message || 'Unknown error'));
    });
  }, []);

  const selectedCategory = categories.find(c => c.id === categoryId);
  const categoryCode = selectedCategory?.code || selectedCategory?.prefix || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side quick phone check
    const digits = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
    if (digits.length < 10) {
      setError('Please enter a valid phone number (at least 10 digits)');
      return;
    }

    if (!participantCode.trim()) {
      setError('Participant Code / Chest Number must be manually entered');
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.post('/participants/register', {
        name: name.trim(),
        categoryId,
        registrationNumber: registrationNumber.trim(),
        phoneNumber: phoneNumber.trim(),
        routineTitle: routineTitle.trim(),
        participantCode: participantCode.trim().toUpperCase()
      });

      setRegisteredPerformer(res.data.participant);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setName('');
    setRegistrationNumber('');
    setPhoneNumber('');
    setRoutineTitle('');
    setParticipantCode('');
    setRegisteredPerformer(null);
    setError('');
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* If registered successfully, display the official confirmation card */}
      {registeredPerformer ? (
        <div className="evt-card" style={{ padding: 28 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ display: 'inline-flex', padding: 12, borderRadius: '50%', background: '#DFF6E8', marginBottom: 12 }}>
              <CheckCircle2 size={48} color="#1C8A4C" />
            </div>
            <div className="evt-eyebrow" style={{ color: '#1C8A4C', fontSize: 13 }}>Help Desk Confirmation</div>
            <h1 className="evt-h1" style={{ fontSize: 36, margin: '4px 0 8px' }}>Registration Successful</h1>
            <p className="evt-sub">The performer has been verified and enrolled into the competition database.</p>
          </div>

          <div style={{
            background: '#F7F9FD',
            border: '2px solid #16274D',
            borderRadius: 14,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            boxShadow: '4px 4px 0 #16274D'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1.5px solid #E2E8F0', paddingBottom: 10 }}>
              <span className="evt-sub" style={{ fontWeight: 600 }}>Performer:</span>
              <span style={{ fontWeight: 800, fontSize: 17, color: '#16274D' }}>{registeredPerformer.name}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1.5px solid #E2E8F0', paddingBottom: 10 }}>
              <span className="evt-sub" style={{ fontWeight: 600 }}>Category:</span>
              <span style={{ fontWeight: 800, color: '#16274D' }}>
                {registeredPerformer.categoryName} <span className="evt-mono evt-badge" style={{ background: '#16274D', color: '#FFD400', marginLeft: 6 }}>{registeredPerformer.categoryCode}</span>
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1.5px solid #E2E8F0', paddingBottom: 10 }}>
              <span className="evt-sub" style={{ fontWeight: 600 }}>Registration Number:</span>
              <span className="evt-mono" style={{ fontWeight: 800, color: '#16274D' }}>{registeredPerformer.registrationNumber}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1.5px solid #E2E8F0', paddingBottom: 10 }}>
              <span className="evt-sub" style={{ fontWeight: 600 }}>Act / Routine:</span>
              <span style={{ fontWeight: 700, color: '#16274D' }}>{registeredPerformer.routineTitle || registeredPerformer.act}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1.5px solid #E2E8F0', paddingBottom: 10 }}>
              <span className="evt-sub" style={{ fontWeight: 600 }}>Phone Number:</span>
              <span className="evt-mono" style={{ fontWeight: 700, color: '#16274D' }}>{registeredPerformer.phoneNumber}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 }}>
              <span className="evt-sub" style={{ fontWeight: 800, color: '#16274D', fontSize: 14 }}>Participant Code / Chest Number:</span>
              <span className="evt-mono evt-badge" style={{ background: '#FFD400', color: '#16274D', border: '2px solid #16274D', fontSize: 20, padding: '6px 14px' }}>
                {registeredPerformer.participantCode}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
            <button
              onClick={handleResetForm}
              className="evt-btn evt-btn-amber"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <RotateCcw size={15} /> Register Another Performer
            </button>
            <Link
              to="/helpdesk/participants"
              className="evt-btn evt-btn-ghost"
              style={{ justifyContent: 'center', textDecoration: 'none' }}
            >
              View Performer Directory <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      ) : (
        /* Performer Registration Form */
        <div className="evt-card" style={{ padding: 28 }}>
          <div className="evt-eyebrow">Help Desk Operations</div>
          <h1 className="evt-h1" style={{ fontSize: 34, marginBottom: 4 }}>Performer Registration</h1>
          <p className="evt-sub" style={{ marginBottom: 20 }}>
            Enter performer registration details. All fields are verified by the backend.
          </p>

          {error && (
            <div style={{
              color: '#D93025',
              background: '#FDE8E8',
              border: '1.5px solid #F87171',
              borderRadius: 8,
              padding: '12px 14px',
              fontSize: 13.5,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 600
            }}>
              <AlertCircle size={17} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 1. Performer Name */}
            <div>
              <label className="evt-label" htmlFor="performer-name">
                Performer Name <span style={{ color: '#EF4136' }}>*</span>
              </label>
              <input
                id="performer-name"
                type="text"
                className="evt-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                required
              />
            </div>

            {/* 2. Category Dropdown */}
            <div>
              <label className="evt-label" htmlFor="performer-category">
                Category <span style={{ color: '#EF4136' }}>*</span>
              </label>
              <select
                id="performer-category"
                className="evt-input"
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                required
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code || c.prefix})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Registration Number */}
            <div>
              <label className="evt-label" htmlFor="reg-number">
                Registration Number <span style={{ color: '#EF4136' }}>*</span>
              </label>
              <input
                id="reg-number"
                type="text"
                className="evt-input evt-mono"
                value={registrationNumber}
                onChange={e => setRegistrationNumber(e.target.value.toUpperCase())}
                placeholder="e.g. REG-2026-045"
                required
              />
              <span className="evt-sub" style={{ fontSize: 11.5, marginTop: 3, display: 'block' }}>
                Provided to the performer upon arrival/invitation.
              </span>
            </div>

            {/* 4. Phone Number */}
            <div>
              <label className="evt-label" htmlFor="phone-number">
                Phone Number <span style={{ color: '#EF4136' }}>*</span>
              </label>
              <input
                id="phone-number"
                type="tel"
                className="evt-input evt-mono"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="e.g. 9876543210"
                required
              />
              <span className="evt-sub" style={{ fontSize: 11.5, marginTop: 3, display: 'block' }}>
                Must be at least 10 digits.
              </span>
            </div>

            {/* 5. Act / Routine Title */}
            <div>
              <label className="evt-label" htmlFor="routine-title">
                Act / Routine Title <span style={{ color: '#EF4136' }}>*</span>
              </label>
              <input
                id="routine-title"
                type="text"
                className="evt-input"
                value={routineTitle}
                onChange={e => setRoutineTitle(e.target.value)}
                placeholder="e.g. Bollywood Fusion, Stand-up Comedy, Classical Solo"
                required
              />
            </div>

            {/* 6. Participant Code / Chest Number with Category Code Reference */}
            <div style={{
              background: '#F7F9FD',
              border: '2px solid #C7CEDE',
              borderRadius: 12,
              padding: 16
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="evt-label" htmlFor="chest-number" style={{ margin: 0 }}>
                  Participant Code / Chest Number <span style={{ color: '#EF4136' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="evt-eyebrow" style={{ margin: 0 }}>Category Code:</span>
                  <span className="evt-mono evt-badge" style={{ background: '#16274D', color: '#FFD400', fontSize: 12 }}>
                    "{categoryCode}"
                  </span>
                </div>
              </div>

              <input
                id="chest-number"
                type="text"
                className="evt-input evt-mono"
                value={participantCode}
                onChange={e => setParticipantCode(e.target.value.toUpperCase())}
                placeholder={`e.g. ${categoryCode ? `${categoryCode}-017` : 'DAN-017'}`}
                style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.05em' }}
                required
              />

              <div style={{ marginTop: 8, fontSize: 12, color: '#5B6890', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Reference:</span>
                <span>Category: <strong>{selectedCategory?.name || 'Selected Category'}</strong></span>
                <span>•</span>
                <span>Category Code: <strong className="evt-mono">"{categoryCode}"</strong></span>
              </div>
              <span className="evt-sub" style={{ fontSize: 11.5, marginTop: 4, display: 'block' }}>
                Must be manually entered by the Help Desk user and unique within the event.
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="evt-btn evt-btn-amber"
              style={{ width: '100%', justifyContent: 'center', marginTop: 10, padding: '14px', fontSize: 15 }}
            >
              <UserPlus size={16} /> {submitting ? 'Registering Performer…' : 'Register Performer'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

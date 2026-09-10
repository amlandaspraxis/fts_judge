import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { Trophy, Crown, Medal, Award, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function StandaloneProjector() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryIdParam = searchParams.get('categoryId');
  const topParam = searchParams.get('top');

  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(categoryIdParam || '');
  const [results, setResults] = useState([]);
  const [topN, setTopN] = useState(topParam === 'ALL' ? 'ALL' : (parseInt(topParam, 10) || 5));
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    api.get('/admin/categories')
      .then(res => {
        const cats = res.data.categories || [];
        setCategories(cats);
        if (!selectedCat && cats.length > 0) {
          setSelectedCat(cats[0].id);
        }
      })
      .catch(console.error);
  }, []);

  const fetchResults = (catId) => {
    if (!catId) return;
    api.get(`/results?categoryId=${catId}`)
      .then(res => setResults(res.data.results || []))
      .catch(console.error);
  };

  useEffect(() => {
    if (selectedCat) {
      fetchResults(selectedCat);
      const interval = setInterval(() => fetchResults(selectedCat), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedCat]);

  const currentCategory = categories.find(c => c.id === selectedCat);
  const displayResults = topN === 'ALL' ? results : results.slice(0, Number(topN) || 5);
  const audienceVotingUrl = `${window.location.origin}/audience/categories`;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0B152A 0%, #16274D 50%, #0E1A36 100%)',
      color: '#FFFFFF',
      padding: '40px 60px',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* Floating Category and Top N Selector Toolbar at top right for stage operator */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 30,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'rgba(22, 39, 77, 0.85)',
        backdropFilter: 'blur(10px)',
        padding: '6px 14px',
        borderRadius: 999,
        border: '1.5px solid rgba(255, 255, 255, 0.2)',
        zIndex: 50
      }}>
        <select
          value={selectedCat}
          onChange={e => setSelectedCat(e.target.value)}
          style={{
            background: '#0E1830',
            color: '#FFD400',
            border: '1px solid #FFD400',
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: 12,
            fontWeight: 700
          }}
        >
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: 4 }}>
          {[3, 4, 5, 10, 20].map(n => (
            <button
              key={n}
              onClick={() => setTopN(n)}
              style={{
                background: topN === n ? '#FFD400' : 'transparent',
                color: topN === n ? '#16274D' : '#CFE3F5',
                border: 'none',
                borderRadius: 4,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Top {n}
            </button>
          ))}
          <button
            onClick={() => setTopN('ALL')}
            style={{
              background: topN === 'ALL' ? '#FFD400' : 'transparent',
              color: topN === 'ALL' ? '#16274D' : '#CFE3F5',
              border: 'none',
              borderRadius: 4,
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            All
          </button>
        </div>

        <button
          onClick={() => setShowQR(!showQR)}
          style={{
            background: showQR ? '#29ABE2' : 'transparent',
            color: '#FFFFFF',
            border: '1px solid #29ABE2',
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          QR
        </button>
      </div>

      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
        <div style={{
          width: 70,
          height: 70,
          borderRadius: '50%',
          background: '#FFD400',
          color: '#16274D',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 30px rgba(255, 212, 0, 0.6)'
        }}>
          <Trophy size={36} />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ background: '#29ABE2', color: '#0E1830', padding: '3px 10px', borderRadius: 999, fontWeight: 900, fontSize: 13 }}>
              FTS 2026 LIVE STAGE
            </span>
            <span style={{ background: '#FFD400', color: '#16274D', padding: '3px 10px', borderRadius: 999, fontWeight: 900, fontSize: 13 }}>
              {topN === 'ALL' ? 'FULL LEADERBOARD' : `TOP ${topN} STANDINGS`}
            </span>
          </div>
          <h1 style={{ fontFamily: 'Luckiest Guy', fontSize: 46, color: '#FFD400', margin: '6px 0 0', letterSpacing: '0.04em' }}>
            {currentCategory?.name || 'Category'}
          </h1>
        </div>
      </div>

      {/* Leaderboard Contenders */}
      <div style={{ display: 'flex', gap: 30, flex: 1 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {displayResults.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
              <div style={{ fontFamily: 'Luckiest Guy', fontSize: 26, color: '#FFFFFF' }}>Awaiting Performance Scores</div>
              <p>Scores will display in real time as judges and audience submit votes.</p>
            </div>
          )}

          {displayResults.map((r, idx) => {
            const isFirst = idx === 0;
            const isSecond = idx === 1;
            const isThird = idx === 2;

            let borderCol = 'rgba(255, 255, 255, 0.15)';
            let bgGradient = 'rgba(255, 255, 255, 0.05)';

            if (isFirst) {
              borderCol = '#FFD400';
              bgGradient = 'linear-gradient(90deg, rgba(255, 212, 0, 0.2) 0%, rgba(255, 255, 255, 0.08) 100%)';
            } else if (isSecond) {
              borderCol = '#94A3B8';
              bgGradient = 'linear-gradient(90deg, rgba(203, 213, 225, 0.15) 0%, rgba(255, 255, 255, 0.06) 100%)';
            } else if (isThird) {
              borderCol = '#CD7F32';
              bgGradient = 'linear-gradient(90deg, rgba(205, 127, 50, 0.15) 0%, rgba(255, 255, 255, 0.06) 100%)';
            }

            return (
              <div
                key={r.id || r.participantId}
                style={{
                  background: bgGradient,
                  border: `2.5px solid ${borderCol}`,
                  borderRadius: 18,
                  padding: isFirst ? '22px 28px' : '16px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  boxShadow: isFirst ? '0 10px 30px rgba(255, 212, 0, 0.25)' : 'none'
                }}
              >
                <div style={{
                  fontFamily: 'Luckiest Guy',
                  fontSize: isFirst ? 36 : 28,
                  minWidth: 50,
                  textAlign: 'center',
                  color: isFirst ? '#FFD400' : isSecond ? '#CBD5E1' : isThird ? '#FDBA74' : '#94A3B8'
                }}>
                  #{r.rank}
                </div>

                <div style={{
                  background: '#16274D',
                  border: `2px solid ${borderCol}`,
                  borderRadius: 12,
                  padding: '8px 14px',
                  color: '#FFD400',
                  fontFamily: 'JetBrains Mono',
                  fontWeight: 900,
                  fontSize: 18
                }}>
                  {r.participantCode}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: isFirst ? 24 : 19, fontWeight: 900 }}>{r.participantName}</div>
                  <div style={{ fontSize: 14, color: '#94A3B8', marginTop: 2 }}>Act: {r.act || 'Performance'}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>Judges (85%)</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 16, fontWeight: 700, color: '#29ABE2' }}>
                      {r.judgeScore}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>Audience (15%)</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 16, fontWeight: 700, color: '#EF4136' }}>
                      {r.audienceScore}%
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', borderLeft: '2px solid rgba(255, 255, 255, 0.2)', paddingLeft: 20 }}>
                    <div style={{ fontSize: 11, color: '#FFD400', fontWeight: 800 }}>TOTAL</div>
                    <div style={{ fontFamily: 'Luckiest Guy', fontSize: isFirst ? 34 : 26 }}>
                      {r.finalScore}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {showQR && (
          <div style={{
            width: 280,
            background: 'rgba(255, 255, 255, 0.98)',
            borderRadius: 22,
            border: '4px solid #FFD400',
            padding: 24,
            color: '#16274D',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            height: 'fit-content'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 900, fontSize: 15 }}>
              <QrCode size={18} color="#0061ff" /> SCAN TO VOTE
            </div>
            <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 14, border: '2px solid #16274D' }}>
              <QRCodeSVG value={audienceVotingUrl} size={180} level="M" />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#5B6890' }}>
              Audience members can vote live for 15% of the total score!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

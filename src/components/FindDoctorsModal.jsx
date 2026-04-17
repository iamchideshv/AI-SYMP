import { useState, useEffect, useCallback } from 'react'

// Specialty mapping based on disease keywords
const SPECIALTY_MAP = [
  { keywords: ['heart', 'cardiac', 'infarction', 'coronary', 'arrhythmia', 'angina', 'hypertension'], specialty: 'Cardiologist', icon: '❤️' },
  { keywords: ['cancer', 'tumor', 'oncology', 'lymphoma', 'leukemia', 'melanoma', 'carcinoma'], specialty: 'Oncologist', icon: '🎗️' },
  { keywords: ['brain', 'neuro', 'stroke', 'parkinson', 'alzheimer', 'migraine', 'epilepsy', 'seizure', 'meningitis'], specialty: 'Neurologist', icon: '🧠' },
  { keywords: ['lung', 'pulmonary', 'pneumonia', 'asthma', 'bronchitis', 'copd', 'tuberculosis', 'embolism'], specialty: 'Pulmonologist', icon: '🫁' },
  { keywords: ['liver', 'hepatitis', 'gastro', 'stomach', 'intestine', 'bowel', 'crohn', 'ulcer', 'pancrea', 'colon'], specialty: 'Gastroenterologist', icon: '🩺' },
  { keywords: ['kidney', 'renal', 'urinary', 'nephritis', 'dialysis'], specialty: 'Nephrologist', icon: '🫘' },
  { keywords: ['diabetes', 'thyroid', 'hormone', 'endocrin', 'adrenal', 'pituitary'], specialty: 'Endocrinologist', icon: '⚗️' },
  { keywords: ['skin', 'rash', 'eczema', 'psoriasis', 'derma', 'acne', 'allerg'], specialty: 'Dermatologist', icon: '🧴' },
  { keywords: ['bone', 'joint', 'arthritis', 'rheumat', 'lupus', 'autoimmune'], specialty: 'Rheumatologist', icon: '🦴' },
  { keywords: ['mental', 'anxiety', 'depression', 'bipolar', 'schizophrenia', 'ptsd', 'ocd'], specialty: 'Psychiatrist', icon: '🧘' },
]

function getSpecialtyForDiseases(diagnoses = []) {
  if (!diagnoses || diagnoses.length === 0) return { specialty: 'General Practitioner', icon: '👨‍⚕️' }
  const topDisease = diagnoses[0]?.name?.toLowerCase() || ''
  for (const entry of SPECIALTY_MAP) {
    if (entry.keywords.some(kw => topDisease.includes(kw))) {
      return { specialty: entry.specialty, icon: entry.icon }
    }
  }
  return { specialty: 'General Practitioner', icon: '👨‍⚕️' }
}

// Fetch nearby hospitals/clinics using Overpass API (OpenStreetMap) — free, no key needed
async function fetchNearbyDoctors(lat, lon, specialty) {
  const radius = 5000 // 5 km
  // Query hospitals and clinics
  const overpassQuery = `
    [out:json][timeout:15];
    (
      node["amenity"="hospital"](around:${radius},${lat},${lon});
      node["amenity"="clinic"](around:${radius},${lat},${lon});
      node["healthcare"="doctor"](around:${radius},${lat},${lon});
      way["amenity"="hospital"](around:${radius},${lat},${lon});
      way["amenity"="clinic"](around:${radius},${lat},${lon});
    );
    out body center 15;
  `
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Overpass API error')
  const data = await res.json()

  const results = []
  const seen = new Set()

  for (const el of data.elements) {
    const tags = el.tags || {}
    const name = tags.name || tags['name:en'] || null
    if (!name || seen.has(name)) continue
    seen.add(name)

    const elLat = el.lat || el.center?.lat
    const elLon = el.lon || el.center?.lon
    if (!elLat || !elLon) continue

    // Distance in km
    const dLat = (elLat - lat) * (Math.PI / 180)
    const dLon = (elLon - lon) * (Math.PI / 180)
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(elLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2
    const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    const type = tags.amenity === 'hospital' ? 'Hospital' : tags.amenity === 'clinic' ? 'Clinic' : 'Medical Centre'
    const phone = tags.phone || tags['contact:phone'] || null
    const openingHours = tags.opening_hours || null
    const website = tags.website || tags['contact:website'] || null

    // Build Google Maps link
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=`
    const directionsLink = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lon}&destination=${elLat},${elLon}`

    results.push({ name, type, dist: dist.toFixed(1), lat: elLat, lon: elLon, phone, openingHours, website, mapsLink, directionsLink })
  }

  results.sort((a, b) => a.dist - b.dist)
  return results.slice(0, 8)
}

// Reverse geocode to get city/area name
async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
      headers: { 'Accept-Language': 'en' }
    })
    const data = await res.json()
    const addr = data.address || {}
    return addr.city || addr.town || addr.village || addr.suburb || addr.county || 'your area'
  } catch {
    return 'your area'
  }
}

export default function FindDoctorsModal({ diagnoses, onClose }) {
  const [step, setStep] = useState('permission') // permission | loading | results | error
  const [location, setLocation] = useState(null)
  const [areaName, setAreaName] = useState('')
  const [doctors, setDoctors] = useState([])
  const [errorMsg, setErrorMsg] = useState('')

  const { specialty, icon } = getSpecialtyForDiseases(diagnoses)
  const topDisease = diagnoses?.[0]?.name || 'your condition'

  const requestLocation = useCallback(() => {
    setStep('loading')
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.')
      setStep('error')
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setLocation({ lat: latitude, lon: longitude })
        try {
          const [area, results] = await Promise.all([
            reverseGeocode(latitude, longitude),
            fetchNearbyDoctors(latitude, longitude, specialty)
          ])
          setAreaName(area)
          setDoctors(results)
          setStep('results')
        } catch (err) {
          setErrorMsg('Failed to fetch nearby facilities. Please check your connection and try again.')
          setStep('error')
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMsg('Location access was denied. Please allow location access in your browser settings and try again.')
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setErrorMsg('Location information is unavailable. Try again.')
        } else {
          setErrorMsg('Request timed out. Please try again.')
        }
        setStep('error')
      },
      { timeout: 10000, maximumAge: 60000 }
    )
  }, [specialty])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fd-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fd-modal">
        {/* Header */}
        <div className="fd-header">
          <div className="fd-header-left">
            <span className="fd-header-icon">🩺</span>
            <div>
              <div className="fd-header-title">Find Nearby Doctors</div>
              <div className="fd-header-sub">Recommended for: <strong>{topDisease}</strong></div>
            </div>
          </div>
          <button className="fd-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Specialty Badge */}
        <div className="fd-specialty-badge">
          <span>{icon}</span>
          <span>Recommended Specialty: <strong>{specialty}</strong></span>
        </div>

        {/* Diagnoses Summary */}
        {diagnoses && diagnoses.length > 0 && (
          <div className="fd-diagnoses-strip">
            {diagnoses.slice(0, 4).map((d, i) => (
              <div key={i} className="fd-diag-chip">
                <span className="fd-diag-chip-name">{d.name}</span>
                <span className="fd-diag-chip-pct">{Math.round(d.confidence * 100)}%</span>
              </div>
            ))}
          </div>
        )}

        {/* Step: Permission */}
        {step === 'permission' && (
          <div className="fd-step-center">
            <div className="fd-location-icon">📍</div>
            <h3 className="fd-step-title">Allow Location Access</h3>
            <p className="fd-step-body">
              InferaDx needs your location to find hospitals and clinics near you
              that specialize in treating <strong>{topDisease}</strong>.
            </p>
            <div className="fd-privacy-note">
              🔒 Your location is used only to search nearby facilities and is never stored.
            </div>
            <button className="fd-primary-btn" onClick={requestLocation}>
              📍 Allow Location &amp; Find Doctors
            </button>
            <button className="fd-ghost-btn" onClick={onClose}>
              Not Now
            </button>
          </div>
        )}

        {/* Step: Loading */}
        {step === 'loading' && (
          <div className="fd-step-center">
            <div className="fd-spinner" />
            <h3 className="fd-step-title" style={{ marginTop: '20px' }}>Finding nearby facilities…</h3>
            <p className="fd-step-body">Searching for {specialty}s and hospitals near you</p>
          </div>
        )}

        {/* Step: Error */}
        {step === 'error' && (
          <div className="fd-step-center">
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>😞</div>
            <h3 className="fd-step-title">Could Not Get Location</h3>
            <p className="fd-step-body" style={{ color: 'rgba(239,68,68,0.85)' }}>{errorMsg}</p>
            <button className="fd-primary-btn" onClick={requestLocation} style={{ marginTop: '20px' }}>
              Try Again
            </button>
            <button className="fd-ghost-btn" onClick={onClose}>Close</button>
          </div>
        )}

        {/* Step: Results */}
        {step === 'results' && (
          <div className="fd-results">
            <div className="fd-results-header">
              <span className="fd-results-count">
                {doctors.length > 0 ? `${doctors.length} facilities found near ${areaName}` : `No facilities found near ${areaName}`}
              </span>
              {location && (
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(specialty + ' hospital')}/@${location.lat},${location.lon},14z`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fd-map-link"
                >
                  Open in Google Maps ↗
                </a>
              )}
            </div>

            {doctors.length === 0 ? (
              <div className="fd-no-results">
                <p>No nearby hospitals or clinics found within 5 km.</p>
                <p style={{ marginTop: 8, fontSize: '13px', color: 'var(--text-muted)' }}>
                  Try searching manually on Google Maps for <strong>{specialty}s</strong> near you.
                </p>
                {location && (
                  <a
                    href={`https://www.google.com/maps/search/${encodeURIComponent(specialty + ' near me')}/@${location.lat},${location.lon},13z`}
                    className="fd-primary-btn"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-block', marginTop: '16px', textDecoration: 'none' }}
                  >
                    Search on Google Maps
                  </a>
                )}
              </div>
            ) : (
              <div className="fd-cards-list">
                {doctors.map((doc, i) => (
                  <div className="fd-card" key={i}>
                    <div className="fd-card-top">
                      <div className="fd-card-type-icon">
                        {doc.type === 'Hospital' ? '🏥' : doc.type === 'Clinic' ? '🏪' : '⚕️'}
                      </div>
                      <div className="fd-card-info">
                        <div className="fd-card-name">{doc.name}</div>
                        <div className="fd-card-meta">
                          <span className="fd-type-badge">{doc.type}</span>
                          <span className="fd-dist-badge">📍 {doc.dist} km away</span>
                        </div>
                      </div>
                    </div>

                    {(doc.phone || doc.openingHours) && (
                      <div className="fd-card-details">
                        {doc.phone && (
                          <a href={`tel:${doc.phone}`} className="fd-detail-chip">
                            📞 {doc.phone}
                          </a>
                        )}
                        {doc.openingHours && (
                          <span className="fd-detail-chip">
                            🕐 {doc.openingHours}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="fd-card-actions">
                      <a
                        href={doc.directionsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fd-btn-directions"
                      >
                        🗺️ Get Directions
                      </a>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(doc.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fd-btn-view"
                      >
                        View on Map
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="fd-disclaimer">
              ⚕️ InferaDx recommends consulting a <strong>{specialty}</strong> for <strong>{topDisease}</strong>. Always verify doctor credentials before visiting.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

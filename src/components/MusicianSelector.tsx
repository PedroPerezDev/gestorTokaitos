import { useState, useEffect, useRef } from 'react';
import { Search, X, UserPlus } from 'lucide-react';
import type { Musician } from '../lib/supabase';

interface SelectedAttendee {
  type: 'musician' | 'guest';
  id?: string;
  name: string;
  instrument?: string;
}

interface MusicianSelectorProps {
  musicians: Musician[];
  selectedAttendees: SelectedAttendee[];
  onAttendeesChange: (attendees: SelectedAttendee[]) => void;
}

export function MusicianSelector({ musicians, selectedAttendees, onAttendeesChange }: MusicianSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestInstrument, setGuestInstrument] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredMusicians = musicians.filter(musician => {
    const matchesSearch = musician.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      musician.instrument?.toLowerCase().includes(searchTerm.toLowerCase());
    const notSelected = !selectedAttendees.some(
      att => att.type === 'musician' && att.id === musician.id
    );
    return matchesSearch && notSelected;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setShowGuestForm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddMusician = (musician: Musician) => {
    onAttendeesChange([
      ...selectedAttendees,
      {
        type: 'musician',
        id: musician.id,
        name: musician.name,
        instrument: musician.instrument || undefined,
      },
    ]);
    setSearchTerm('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    onAttendeesChange([
      ...selectedAttendees,
      {
        type: 'guest',
        name: guestName.trim(),
        instrument: guestInstrument.trim() || undefined,
      },
    ]);
    setGuestName('');
    setGuestInstrument('');
    setShowGuestForm(false);
    setSearchTerm('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleRemoveAttendee = (index: number) => {
    onAttendeesChange(selectedAttendees.filter((_, i) => i !== index));
  };

  return (
    <div className="musician-selector">
      <div className="musician-selector-input-wrapper" ref={dropdownRef}>
        <div className="musician-selector-search">
          <Search size={20} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar músico o añadir invitado..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
              setShowGuestForm(false);
            }}
            onFocus={() => setShowDropdown(true)}
          />
        </div>

        {showDropdown && (
          <div className="musician-selector-dropdown">
            {!showGuestForm ? (
              <>
                {filteredMusicians.length > 0 && (
                  <div className="dropdown-section">
                    <div className="dropdown-section-title">Músicos registrados</div>
                    {filteredMusicians.map((musician) => (
                      <button
                        key={musician.id}
                        type="button"
                        className="dropdown-item"
                        onClick={() => handleAddMusician(musician)}
                      >
                        <span className="dropdown-item-name">{musician.name}</span>
                        {musician.instrument && (
                          <span className="dropdown-item-instrument">{musician.instrument}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                <div className="dropdown-section">
                  <button
                    type="button"
                    className="dropdown-item dropdown-item-action"
                    onClick={() => setShowGuestForm(true)}
                  >
                    <UserPlus size={18} />
                    <span>Añadir músico invitado</span>
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleAddGuest} className="guest-form">
                <div className="guest-form-title">Añadir músico invitado</div>
                <input
                  type="text"
                  placeholder="Nombre *"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  autoFocus
                  required
                />
                <input
                  type="text"
                  placeholder="Instrumento (opcional)"
                  value={guestInstrument}
                  onChange={(e) => setGuestInstrument(e.target.value)}
                />
                <div className="guest-form-actions">
                  <button
                    type="button"
                    className="btn-secondary-small"
                    onClick={() => {
                      setShowGuestForm(false);
                      setGuestName('');
                      setGuestInstrument('');
                    }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary-small">
                    Añadir
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {selectedAttendees.length > 0 && (
        <div className="selected-attendees">
          {selectedAttendees.map((attendee, index) => (
            <div key={index} className="selected-attendee-chip">
              <span className="chip-name">{attendee.name}</span>
              {attendee.instrument && (
                <span className="chip-instrument">({attendee.instrument})</span>
              )}
              {attendee.type === 'guest' && (
                <span className="chip-badge">Invitado</span>
              )}
              <button
                type="button"
                onClick={() => handleRemoveAttendee(index)}
                className="chip-remove"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

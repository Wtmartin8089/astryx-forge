import React, { useState, useEffect } from 'react';
import '../../styles/CharacterSheet.css';

type CharacterData = {
  name: string;
  species: string;
  rank: string;
  assignment: string;
  attributes: Record<string, number>;
  disciplines: Record<string, number>;
  talents: string;
  values: string;
};

const defaultAttributes = ['Control', 'Daring', 'Fitness', 'Insight', 'Presence', 'Reason'];
const defaultDisciplines = ['Command', 'Conn', 'Engineering', 'Security', 'Science', 'Medicine'];

export default function CharacterSheet() {
  const [character, setCharacter] = useState<CharacterData>(() => {
    const saved = localStorage.getItem('characterSheet');
    return saved
      ? JSON.parse(saved)
      : {
          name: '',
          species: '',
          rank: '',
          assignment: '',
          attributes: Object.fromEntries(defaultAttributes.map(attr => [attr, 0])),
          disciplines: Object.fromEntries(defaultDisciplines.map(disc => [disc, 0])),
          talents: '',
          values: '',
        };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    localStorage.setItem('characterSheet', JSON.stringify(character));
  }, [character]);

  function handleChange(field: string, value: string | number) {
    setCharacter(prev => ({ ...prev, [field]: value }));
  }

  function handleNestedChange(section: 'attributes' | 'disciplines', key: string, value: number) {
    setCharacter(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  }

  function validate() {
    const newErrors: Record<string, string> = {};
    if (!character.name.trim()) newErrors.name = 'Name is required';
    if (!character.species.trim()) newErrors.species = 'Species is required';
    return newErrors;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
    } else {
      alert('Character saved!');
      setErrors({});
    }
  }

  return (
    <form className="character-sheet" onSubmit={handleSubmit}>
      <h2>Character Sheet</h2>

      <section>
        <label>Name:</label>
        <input
          type="text"
          value={character.name}
          onChange={e => handleChange('name', e.target.value)}
        />
        {errors.name && <span className="error">{errors.name}</span>}

        <label>Species:</label>
        <input
          type="text"
          value={character.species}
          onChange={e => handleChange('species', e.target.value)}
        />
        {errors.species && <span className="error">{errors.species}</span>}

        <label>Rank:</label>
        <input
          type="text"
          value={character.rank}
          onChange={e => handleChange('rank', e.target.value)}
        />

        <label>Assignment:</label>
        <input
          type="text"
          value={character.assignment}
          onChange={e => handleChange('assignment', e.target.value)}
        />
      </section>

      <section>
        <h3>Attributes</h3>
        <div className="grid">
          {defaultAttributes.map(attr => (
            <div key={attr}>
              <label>{attr}:</label>
              <input
                type="number"
                value={character.attributes[attr]}
                onChange={e => handleNestedChange('attributes', attr, parseInt(e.target.value))}
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3>Disciplines</h3>
        <div className="grid">
          {defaultDisciplines.map(disc => (
            <div key={disc}>
              <label>{disc}:</label>
              <input
                type="number"
                value={character.disciplines[disc]}
                onChange={e => handleNestedChange('disciplines', disc, parseInt(e.target.value))}
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3>Talents</h3>
        <textarea
          rows={3}
          value={character.talents}
          onChange={e => handleChange('talents', e.target.value)}
        />
      </section>

      <section>
        <h3>Values</h3>
        <textarea
          rows={3}
          value={character.values}
          onChange={e => handleChange('values', e.target.value)}
        />
      </section>

      <button type="submit">Save Character</button>
    </form>
  );
}

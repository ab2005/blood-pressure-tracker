// ElevenLabs Client Tools for Blood Pressure Tracker
// This file contains all the client-side tool implementations

const ClientTools = {
  redirectToDocs: ({ path }) => {
    const router = window?.next?.router;
    if (router) {
      router.push(path);
    }
  },

  logBloodPressure: ({ systolic, diastolic, pulse, time, details }) => {
    console.log('Logging blood pressure:', { systolic, diastolic, pulse, time, details });

    // Create reading object
    const reading = {
      id: Date.now().toString(),
      systolic: parseInt(systolic),
      diastolic: parseInt(diastolic),
      pulse: pulse ? parseInt(pulse) : null,
      date: time ? new Date(time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      time: time ? new Date(time).toTimeString().split(' ')[0].slice(0, 5) : new Date().toTimeString().split(' ')[0].slice(0, 5),
      notes: details || '',
      source: 'voice_assistant'
    };

    // Save to localStorage as backup
    const existingReadings = JSON.parse(localStorage.getItem('bpReadings') || '[]');
    existingReadings.push(reading);
    localStorage.setItem('bpReadings', JSON.stringify(existingReadings));

    return `Successfully logged blood pressure: ${systolic}/${diastolic} ${pulse ? `(pulse: ${pulse})` : ''} at ${reading.time}${details ? ` - ${details}` : ''}`;
  },

  getBloodPressureHistory: ({ days = 7 }) => {
    console.log(`🔍 Getting blood pressure history for last ${days} days`);

    let readings = JSON.parse(localStorage.getItem('bpReadings') || '[]');
    console.log(`📊 Total readings in localStorage:`, readings.length);
    console.log(`📋 All readings:`, readings);

    // If no recent readings, add some test data for demonstration
    if (readings.length === 0 || !readings.some(r => {
      const readingDate = new Date(r.date);
      const cutoffTest = new Date();
      cutoffTest.setDate(cutoffTest.getDate() - days);
      return readingDate >= cutoffTest;
    })) {
      console.log('🔧 No recent readings found, adding test data for demonstration');
      
      const testReadings = [
        {
          id: Date.now().toString(),
          systolic: 120,
          diastolic: 80,
          pulse: 72,
          date: new Date().toISOString().split('T')[0], // Today
          time: '08:00',
          notes: 'Morning reading',
          source: 'demo'
        },
        {
          id: (Date.now() + 1).toString(),
          systolic: 125,
          diastolic: 82,
          pulse: 75,
          date: new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0], // Yesterday
          time: '20:00',
          notes: 'Evening reading',
          source: 'demo'
        },
        {
          id: (Date.now() + 2).toString(),
          systolic: 118,
          diastolic: 78,
          pulse: 70,
          date: new Date(Date.now() - 2*24*60*60*1000).toISOString().split('T')[0], // 2 days ago
          time: '09:30',
          notes: 'After exercise',
          source: 'demo'
        }
      ];
      
      readings = [...readings, ...testReadings];
      localStorage.setItem('bpReadings', JSON.stringify(readings));
      console.log('✅ Added test data, new total:', readings.length);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    console.log(`📅 Cutoff date (${days} days ago):`, cutoffDate.toISOString().split('T')[0]);

    const recentReadings = readings.filter(reading => {
      const readingDate = new Date(reading.date);
      const isRecent = readingDate >= cutoffDate;
      console.log(`🔍 Checking reading date: ${reading.date} vs cutoff: ${cutoffDate.toISOString().split('T')[0]} - Include: ${isRecent}`);
      return isRecent;
    });

    console.log(`✅ Filtered readings count:`, recentReadings.length);
    console.log(`✅ Filtered readings:`, recentReadings);

    if (recentReadings.length === 0) {
      return `No blood pressure readings found in the last ${days} days.`;
    }

    // Sort by date (newest first)
    recentReadings.sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));

    const summary = recentReadings.map(r =>
      `${r.date} ${r.time}: ${r.systolic}/${r.diastolic}${r.pulse ? ` (${r.pulse} bpm)` : ''}${r.notes ? ` - ${r.notes}` : ''}`
    ).join('\n');

    const result = `Blood pressure readings for last ${days} days:\n${summary}`;
    console.log(`📤 Returning result:`, result);

    return result;
  },

  analyzeBloodPressure: ({ systolic, diastolic }) => {
    console.log('Analyzing blood pressure:', { systolic, diastolic });

    const sys = parseInt(systolic);
    const dia = parseInt(diastolic);

    let category = '';
    let recommendation = '';

    if (sys < 120 && dia < 80) {
      category = 'Normal';
      recommendation = 'Keep up the good work! Maintain healthy lifestyle habits.';
    } else if (sys < 130 && dia < 80) {
      category = 'Elevated';
      recommendation = 'Consider lifestyle changes like diet and exercise. Monitor regularly.';
    } else if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) {
      category = 'Stage 1 Hypertension';
      recommendation = 'Consult with your healthcare provider about treatment options.';
    } else if (sys >= 140 || dia >= 90) {
      category = 'Stage 2 Hypertension';
      recommendation = 'Important: Schedule an appointment with your doctor promptly.';
    } else if (sys >= 180 || dia >= 120) {
      category = 'Hypertensive Crisis';
      recommendation = 'URGENT: Seek immediate medical attention!';
    }

    return `Blood pressure ${sys}/${dia} is classified as: ${category}. ${recommendation}`;
  },

  setMedicationReminder: ({ medication, time, frequency, notes }) => {
    console.log('Setting medication reminder:', { medication, time, frequency, notes });

    const reminder = {
      id: Date.now().toString(),
      medication: medication,
      time: time,
      frequency: frequency || 'daily',
      notes: notes || '',
      created: new Date().toISOString()
    };

    const reminders = JSON.parse(localStorage.getItem('medicationReminders') || '[]');
    reminders.push(reminder);
    localStorage.setItem('medicationReminders', JSON.stringify(reminders));

    return `Medication reminder set: ${medication} at ${time} ${frequency}. ${notes ? `Note: ${notes}` : ''}`;
  },

  redirectToEmailSupport: ({ subject, body }) => {
    console.log('Redirecting to email support...');
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    window.open(
      `mailto:team@elevenlabs.io?subject=${encodedSubject}&body=${encodedBody}`,
      '_blank'
    );
  },

  redirectToSupportForm: ({ subject, description, extraInfo }) => {
    const baseUrl = 'https://help.elevenlabs.io/hc/en-us/requests/new';
    const ticketFormId = '13145996177937';
    const encodedSubject = encodeURIComponent(subject);
    const encodedDescription = encodeURIComponent(description);
    const encodedExtraInfo = encodeURIComponent(extraInfo);

    const fullUrl = `${baseUrl}?ticket_form_id=${ticketFormId}&tf_subject=${encodedSubject}&tf_description=${encodedDescription}%3Cbr%3E%3Cbr%3E${encodedExtraInfo}`;

    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  },

  redirectToExternalURL: ({ url }) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  },

  getCurrentDateTime: () => {
    console.log('Getting current date and time');
    
    const now = new Date();
    const date = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric', 
      month: 'long',
      day: 'numeric'
    });
    const time = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    const result = `Current date and time: ${date}, ${time}`;
    console.log('📅 Returning:', result);
    
    return result;
  },

  getLocation: () => {
    console.log('🌍 Getting user location');
    
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = 'Geolocation is not supported by this browser';
        console.error('❌ ' + error);
        resolve(error);
        return;
      }

      // Set timeout and options for geolocation
      const options = {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds
        maximumAge: 300000 // 5 minutes cache
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const accuracy = Math.round(position.coords.accuracy);
            
            console.log(`📍 Position: ${lat}, ${lon} (±${accuracy}m)`);
            
            // Try to get address using reverse geocoding
            try {
              const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
              const data = await response.json();
              
              const city = data.city || data.locality || 'Unknown';
              const country = data.countryName || 'Unknown';
              const address = data.locality || city;
              
              const result = `Location: ${city}, ${country}\nCoordinates: ${lat.toFixed(6)}, ${lon.toFixed(6)}\nAccuracy: ±${accuracy} meters`;
              console.log('🗺️ Location result:', result);
              resolve(result);
              
            } catch (geocodeError) {
              console.warn('⚠️ Reverse geocoding failed, returning coordinates only');
              const result = `Location coordinates: ${lat.toFixed(6)}, ${lon.toFixed(6)}\nAccuracy: ±${accuracy} meters`;
              resolve(result);
            }
            
          } catch (error) {
            console.error('❌ Error processing location:', error);
            resolve('Location obtained but could not process the data');
          }
        },
        (error) => {
          console.error('❌ Geolocation error:', error);
          let errorMessage = 'Could not get location: ';
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage += 'Location request timed out';
              break;
            default:
              errorMessage += 'Unknown location error';
              break;
          }
          
          resolve(errorMessage);
        },
        options
      );
    });
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClientTools;
} else if (typeof window !== 'undefined') {
  window.ClientTools = ClientTools;
  console.log('✅ ClientTools loaded successfully');
  console.log('🔧 Available tools:', Object.keys(ClientTools));
}

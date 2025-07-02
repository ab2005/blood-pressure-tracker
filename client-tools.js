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

    const readings = JSON.parse(localStorage.getItem('bpReadings') || '[]');
    console.log(`📊 Total readings in localStorage:`, readings.length);
    console.log(`📋 All readings:`, readings);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    console.log(`📅 Cutoff date (${days} days ago):`, cutoffDate.toISOString().split('T')[0]);

    const recentReadings = readings.filter(reading => {
      const readingDate = new Date(reading.date);
      console.log(`🔍 Checking reading date: ${reading.date} vs cutoff: ${cutoffDate.toISOString().split('T')[0]} - Include: ${readingDate >= cutoffDate}`);
      return readingDate >= cutoffDate;
    });

    console.log(`✅ Filtered readings count:`, recentReadings.length);
    console.log(`✅ Filtered readings:`, recentReadings);

    if (recentReadings.length === 0) {
      return `No blood pressure readings found in the last ${days} days.`;
    }

    const summary = recentReadings.map(r =>
      `${r.date} ${r.time}: ${r.systolic}/${r.diastolic}${r.pulse ? ` (${r.pulse} bpm)` : ''}`
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

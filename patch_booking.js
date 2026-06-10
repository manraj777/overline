const fs = require('fs');
const file = 'apps/mobile-user/src/screens/booking/BookingScreen.tsx';
let content = fs.readFileSync(file, 'utf8');
if (!content.includes('// Auto-select first available')) {
    content = content.replace(
        'const timeSlots = useMemo(() => {',
        `const timeSlots = useMemo(() => {`
    );
    content = content.replace(
        'const nearestFreeSlot = useMemo(() => {',
        `  // Auto-select first available
  React.useEffect(() => {
    if (!selectedSlotStartTime && timeSlots.length > 0) {
      const firstAvailable = timeSlots.find(s => s.available);
      if (firstAvailable) {
        setSelectedSlotStartTime(firstAvailable.startTime);
      }
    }
  }, [timeSlots, selectedSlotStartTime]);

  const nearestFreeSlot = useMemo(() => {`
    );
    fs.writeFileSync(file, content);
    console.log("Patched BookingScreen.tsx");
} else {
    console.log("Already patched");
}

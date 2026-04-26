import '../models/absence_request.dart';
import '../models/alert_item.dart';
import '../models/shift.dart';

const List<Shift> mockShifts = <Shift>[
  Shift(
    id: '1',
    type: 'clock-out',
    time: '04:35 PM',
    date: 'Yesterday',
    location: 'Main Site',
    duration: '8h 15m',
    status: 'Verified',
  ),
  Shift(
    id: '2',
    type: 'clock-in',
    time: '08:20 AM',
    date: 'Yesterday',
    location: 'Main Site',
  ),
  Shift(
    id: '3',
    type: 'regular',
    time: '09:15 AM - 05:00 PM',
    date: 'Oct 23',
    location: 'Innovation Hub',
    image:
        'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=400',
  ),
];

const List<AbsenceRequest> mockAbsences = <AbsenceRequest>[
  AbsenceRequest(
    id: '1',
    type: 'Summer Vacation',
    dates: 'Aug 12 - Aug 16',
    duration: '5 days',
    status: 'pending',
  ),
  AbsenceRequest(
    id: '2',
    type: "Doctor's Appointment",
    dates: 'Jul 28',
    duration: '0.5 days',
    status: 'approved',
  ),
  AbsenceRequest(
    id: '3',
    type: 'Personal Emergency',
    dates: 'Jun 14',
    duration: '1 day',
    status: 'rejected',
  ),
];

const List<AlertItem> mockAlerts = <AlertItem>[
  AlertItem(
    id: '1',
    title: 'Leave request approved',
    description:
        'Your annual leave for Aug 12-15 has been successfully processed and approved by the HR team.',
    time: '10 mins ago',
    type: 'success',
    isRead: false,
  ),
  AlertItem(
    id: '2',
    title: 'Reminder to clock out',
    description:
        'Your shift ended 15 minutes ago. Please remember to clock out via the dashboard to ensure accurate payroll.',
    time: '15 mins ago',
    type: 'warning',
    isRead: false,
    action: 'Action Required',
  ),
  AlertItem(
    id: '3',
    title: 'Company announcement',
    description:
        'Q3 Town Hall meeting is scheduled for next Tuesday. Please find the agenda attached in the portal.',
    time: '2 hours ago',
    type: 'info',
    isRead: true,
    image:
        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=400',
  ),
];

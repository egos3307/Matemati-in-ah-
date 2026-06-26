import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import LiveMeeting from '../components/LiveMeeting';
import ZoomMeeting from '../components/ZoomMeeting';

const parseZoomUrl = (url) => {
  if (!url) return { meetingNumber: '', password: '' };
  const numberMatch = url.match(/\/j\/(\d+)/) || url.match(/\/s\/(\d+)/) || url.match(/\b\d{9,11}\b/);
  const meetingNumber = numberMatch ? numberMatch[1] || numberMatch[0] : '';
  const pwdMatch = url.match(/pwd=([^&]+)/) || url.match(/[\?&]pwd=(\w+)/);
  const password = pwdMatch ? pwdMatch[1] : '';
  return { meetingNumber, password };
};

const BLOG_IMAGE_PRESETS = [
  { name: 'Kara Tahta', url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=1200' },
  { name: 'Geometri', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200' },
  { name: 'Bilgisayar', url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=1200' },
  { name: 'Matematik Grafiği', url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=1200' },
  { name: 'Eğitim Kitapları', url: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&q=80&w=1200' }
];

const handleImageUpload = (file, callback) => {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const MAX_WIDTH = 1200;
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
      callback(compressedDataUrl);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
};

const TeacherDashboard = () => {
  const [students, setStudents] = useState([]);
  const [newStudent, setNewStudent] = useState({ email: '', password: '', name: '', grade: '', parentName: '', parentTel: '', studentTel: '', serviceProvided: '' });
  const [newLesson, setNewLesson] = useState({ title: '', description: '', date: '' });
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentTrials, setStudentTrials] = useState([]);
  const [expandedTrialId, setExpandedTrialId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const { user } = useAuth();

  // Calendar states
  const [lessons, setLessons] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [lessonTime, setLessonTime] = useState('12:00');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [newLessonZoomUrl, setNewLessonZoomUrl] = useState('');
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [newBlog, setNewBlog] = useState({ title: '', content: '', excerpt: '', coverImage: '' });
  const [blogView, setBlogView] = useState('list');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [insertImgOpen, setInsertImgOpen] = useState(false);
  const [editingRecordingId, setEditingRecordingId] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [newTeacher, setNewTeacher] = useState({ name: '', email: '', password: '', studentTel: '' });
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [showEditTeacherModal, setShowEditTeacherModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState({ id: null, name: '', email: '', studentTel: '', password: '' });
  const [assigningStudentId, setAssigningStudentId] = useState(null);

  // Form submission and question states
  const [trialRequests, setTrialRequests] = useState([]);
  const [contactMessages, setContactMessages] = useState([]);
  const [selectedRequestForSchedule, setSelectedRequestForSchedule] = useState(null);
  const [scheduledDateInput, setScheduledDateInput] = useState('');
  const [scheduledTimeInput, setScheduledTimeInput] = useState('12:00');
  const [approvedRequestResult, setApprovedRequestResult] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState({ id: null, email: '', name: '', grade: '', parentName: '', parentTel: '', studentTel: '', serviceProvided: '' });
  const [showPaymentEditModal, setShowPaymentEditModal] = useState(false);
  const [paymentEditingStudent, setPaymentEditingStudent] = useState(null);
  const [paymentSearch, setPaymentSearch] = useState('');

  // Camp states
  const [campsList, setCampsList] = useState([]);
  const [newCamp, setNewCamp] = useState({
    badge: '',
    title: '',
    subtitle: '',
    image: '',
    description: '',
    highlights: '',
    whatsappLink: '',
    tarih: '',
    dersProgrami: '',
    toplamDers: '',
    egitimTuru: 'Online Canlı Eğitim (Zoom)'
  });
  const [campView, setCampView] = useState('list');
  const [deleteConfirmCampId, setDeleteConfirmCampId] = useState(null);

  const trMonths = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  const trDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  const getWhatsAppLink = (phone, message = '') => {
    if (!phone) return '#';
    const cleaned = phone.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length === 10) formatted = `90${cleaned}`;
    else if (cleaned.length === 11 && cleaned.startsWith('0')) formatted = `90${cleaned.substring(1)}`;
    
    if (message) {
      return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
    }
    return `https://wa.me/${formatted}`;
  };

  const getGradeDistribution = () => {
    const counts = {};
    students.forEach(s => {
      const grade = s.grade || 'Diğer';
      counts[grade] = (counts[grade] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  const getUpcomingLessons = () => {
    const today = new Date();
    return lessons
      .filter(l => new Date(l.date) >= today)
      .slice(0, 4);
  };

  useEffect(() => {
    fetchStudents();
    fetchLessons();
    fetchTrialRequests();
    fetchContactMessages();
    fetchCamps();
    if (user?.role === 'HEAD_TEACHER') {
      fetchTeachers();
    }
  }, [user]);

  const fetchStudents = async () => {
    try {
      const res = await axios.get('/api/teacher/students');
      setStudents(res.data);
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchLessons = async () => {
    try {
      const res = await axios.get('/api/teacher/lessons');
      setLessons(res.data);
    } catch (err) {
      console.error('Error fetching lessons:', err);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await axios.get('/api/teacher/teachers');
      setTeachers(res.data);
    } catch (err) {
      console.error('Error fetching teachers:', err);
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/teacher/add-teacher', newTeacher);
      setNewTeacher({ name: '', email: '', password: '', studentTel: '' });
      fetchTeachers();
      setShowAddTeacherModal(false);
      alert('Öğretmen başarıyla eklendi!');
    } catch (err) {
      alert('Öğretmen eklenirken hata oluştu: ' + (err.response?.data?.error || err.message));
    }
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const handleEditTeacherClick = (teacher) => {
    setEditingTeacher({
      id: teacher.id,
      name: teacher.name || '',
      email: teacher.email || '',
      studentTel: teacher.studentTel || '',
      password: ''
    });
    setShowEditTeacherModal(true);
  };

  const handleEditTeacherSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/teacher/teachers/${editingTeacher.id}`, editingTeacher);
      setShowEditTeacherModal(false);
      fetchTeachers();
      alert('Öğretmen bilgileri başarıyla güncellendi.');
    } catch (err) {
      console.error('Error updating teacher:', err);
      alert('Öğretmen güncellenirken bir hata oluştu: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteTeacher = async (teacherId, teacherName) => {
    if (!window.confirm(`"${teacherName}" adlı öğretmeni silmek istediğinize emin misiniz? Bu işlem öğretmene ait tüm dersleri ve blog yazılarını silecektir!`)) {
      return;
    }
    try {
      await axios.delete(`/api/teacher/teachers/${teacherId}`);
      fetchTeachers();
      alert('Öğretmen başarıyla silindi.');
    } catch (err) {
      console.error('Error deleting teacher:', err);
      alert('Öğretmen silinirken bir hata oluştu: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleAssignTeacher = async (studentId, teacherId) => {
    try {
      await axios.post(`/api/teacher/students/${studentId}/assign-teacher`, { teacherId });
      fetchStudents();
      fetchTeachers();
      setAssigningStudentId(null);
      alert('Öğrenci öğretmen ataması güncellendi!');
    } catch (err) {
      alert('Atama yapılırken hata oluştu: ' + (err.response?.data?.error || err.message));
    }
  };

  const fetchStudentTrials = async (student) => {
    try {
      const res = await axios.get(`/api/teacher/student/${student.id}/trials`);
      setStudentTrials(res.data);
      setSelectedStudent(student);
      setExpandedTrialId(null);
      setActiveTab('student-detail');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/teacher/add-student', newStudent);
      setNewStudent({ email: '', password: '', name: '', grade: '', parentName: '', parentTel: '', studentTel: '', serviceProvided: '' });
      fetchStudents();
      setShowAddModal(false);
      alert(`Öğrenci Kaydedildi!\nÖğrenci Giriş Kodu: ${res.data.studentCode}\nVeli Giriş Kodu: ${res.data.parentCode}`);
    } catch (err) {
      console.error('Error adding student:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Öğrenci eklenirken bir hata oluştu.';
      alert(`Hata: ${message}`);
    }
  };

  const handleEditStudentClick = (student) => {
    setEditingStudent({
      id: student.id,
      email: student.email || '',
      name: student.name || '',
      grade: student.grade || '',
      parentName: student.parentName || '',
      parentTel: student.parentTel || '',
      studentTel: student.studentTel || '',
      serviceProvided: student.serviceProvided || ''
    });
    setShowEditModal(true);
  };

  const handleEditStudentSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/teacher/student/${editingStudent.id}`, editingStudent);
      setShowEditModal(false);
      fetchStudents();
      alert('Öğrenci bilgileri başarıyla güncellendi.');
    } catch (err) {
      console.error('Error updating student:', err);
      alert('Öğrenci güncellenirken bir hata oluştu: ' + (err.response?.data?.error || err.message));
    }
  };

  const handlePaymentEditClick = (student) => {
    setPaymentEditingStudent({
      id: student.id,
      name: student.name,
      studentCode: student.studentCode,
      grade: student.grade || '',
      email: student.email || '',
      parentName: student.parentName || '',
      parentTel: student.parentTel || '',
      studentTel: student.studentTel || '',
      serviceProvided: student.serviceProvided || '',
      paymentStatus: student.paymentStatus || 'UNPAID',
      paymentDay: student.paymentDay || '',
      paymentAmount: student.paymentAmount || '',
      paymentNote: student.paymentNote || '',
      paymentType: student.paymentType || 'MONTHLY',
      totalLessons: student.totalLessons || 0
    });
    setShowPaymentEditModal(true);
  };

  const handlePaymentEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/teacher/student/${paymentEditingStudent.id}`, paymentEditingStudent);
      setShowPaymentEditModal(false);
      fetchStudents();
      alert('Ödeme bilgileri başarıyla güncellendi.');
    } catch (err) {
      console.error('Error updating payment:', err);
      alert('Ödeme güncellenirken hata oluştu: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    if (!window.confirm(`"${studentName}" adlı öğrenciyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) {
      return;
    }
    try {
      await axios.delete(`/api/teacher/student/${studentId}`);
      fetchStudents();
      // Reset selected student details if currently opened student is deleted
      if (selectedStudent && selectedStudent.id === studentId) {
        setSelectedStudent(null);
        setActiveTab('students');
      }
      alert('Öğrenci başarıyla silindi.');
    } catch (err) {
      console.error('Error deleting student:', err);
      alert('Öğrenci silinirken bir hata oluştu: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCreateLesson = async (e) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) {
      alert('Lütfen bu ders için en az bir öğrenci seçin.');
      return;
    }
    try {
      const dateObj = new Date(selectedDate);
      const [hours, minutes] = lessonTime.split(':');
      dateObj.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      await axios.post('/api/teacher/create-lesson', {
        title: newLesson.title,
        description: newLesson.description,
        date: dateObj.toISOString(),
        studentIds: selectedStudentIds,
        zoomJoinUrl: newLessonZoomUrl
      });
      setNewLesson({ title: '', description: '', date: '' });
      setLessonTime('12:00');
      setSelectedStudentIds([]);
      setNewLessonZoomUrl('');
      fetchLessons();
      alert('Ders başarıyla oluşturuldu!');
    } catch (err) {
      alert('Ders oluşturulurken hata oluştu.');
    }
  };

  useEffect(() => {
    if (activeTab === 'blog') {
      fetchBlogs();
    } else if (activeTab === 'camps') {
      fetchCamps();
    } else if (activeTab === 'forms') {
      fetchTrialRequests();
      fetchContactMessages();
    }
  }, [activeTab]);

  const fetchBlogs = async () => {
    try {
      const res = await axios.get('/api/blog');
      setBlogs(res.data);
    } catch (err) {
      console.error('Error fetching blogs:', err);
    }
  };

  const fetchCamps = async () => {
    try {
      const res = await axios.get('/api/camps');
      setCampsList(res.data);
    } catch (err) {
      console.error('Error fetching camps:', err);
    }
  };

  const fetchTrialRequests = async () => {
    try {
      const res = await axios.get('/api/teacher/trial-requests');
      setTrialRequests(res.data);
    } catch (err) {
      console.error('Error fetching trial requests:', err);
    }
  };

  const fetchContactMessages = async () => {
    try {
      const res = await axios.get('/api/teacher/contact-messages');
      setContactMessages(res.data);
    } catch (err) {
      console.error('Error fetching contact messages:', err);
    }
  };

  const handleApproveTrialRequest = async (requestId) => {
    if (!scheduledDateInput || !scheduledTimeInput) {
      alert('Lütfen bir tarih ve saat seçin.');
      return;
    }
    try {
      const scheduledDateTime = new Date(`${scheduledDateInput}T${scheduledTimeInput}`);
      const res = await axios.post(`/api/teacher/trial-requests/${requestId}/approve`, {
        scheduledDate: scheduledDateTime.toISOString()
      });
      alert('Tanışma dersi başarıyla onaylandı ve ders oluşturuldu!');
      
      // Update local state list
      setTrialRequests(prev => prev.map(req => req.id === requestId ? res.data.request : req));
      
      // Store result to show success panel with credentials and WhatsApp link
      const formattedDate = new Date(scheduledDateTime).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const formattedTime = scheduledTimeInput;
      const waText = `Merhaba ${res.data.request.studentName}, ücretsiz tanışma dersi talebiniz onaylandı. Dersiniz ${formattedDate} saat ${formattedTime} olarak belirlenmiştir. Derse katılmak için öğrenci girişi yapabilirsiniz.\n\nGiriş bilgileriniz:\nKod: ${res.data.studentCode}\nŞifre: student\n\nGiriş adresi: https://fullematematik.com/giris`;
      
      setApprovedRequestResult({
        studentName: res.data.request.studentName,
        studentCode: res.data.studentCode,
        scheduledDate: formattedDate,
        scheduledTime: formattedTime,
        phone: res.data.request.phone,
        whatsappLink: `https://wa.me/${res.data.request.phone.replace(/\D/g, '').startsWith('0') ? '90' + res.data.request.phone.replace(/\D/g, '').substring(1) : '90' + res.data.request.phone.replace(/\D/g, '')}?text=${encodeURIComponent(waText)}`
      });

      setSelectedRequestForSchedule(null);
      // Refresh students and lessons lists
      fetchStudents();
      fetchLessons();
    } catch (err) {
      alert(err.response?.data?.error || 'Talebi onaylarken hata oluştu.');
    }
  };

  const handleRejectTrialRequest = async (requestId) => {
    if (!window.confirm('Bu tanışma dersi talebini reddetmek istediğinize emin misiniz?')) return;
    try {
      const res = await axios.post(`/api/teacher/trial-requests/${requestId}/reject`);
      setTrialRequests(prev => prev.map(req => req.id === requestId ? res.data : req));
    } catch (err) {
      alert('Hata oluştu.');
    }
  };

  const handleDeleteContactMessage = async (messageId) => {
    if (!window.confirm('Bu mesajı silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`/api/teacher/contact-messages/${messageId}`);
      setContactMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (err) {
      alert('Hata oluştu.');
    }
  };

  const handleCreateCamp = async (e) => {
    e.preventDefault();
    try {
      const highlightsArray = newCamp.highlights
        .split('\n')
        .map(h => h.trim())
        .filter(h => h.length > 0);

      const detailsArray = [
        { icon: 'calendar_month', label: 'Tarih', value: newCamp.tarih || 'Belirtilmedi' },
        { icon: 'schedule', label: 'Ders Programı', value: newCamp.dersProgrami || 'Belirtilmedi' },
        { icon: 'filter_list', label: 'Toplam', value: newCamp.toplamDers || 'Belirtilmedi' },
        { icon: 'videocam', label: 'Eğitim Türü', value: newCamp.egitimTuru || 'Online Canlı Eğitim (Zoom)' }
      ];

      let waLink = newCamp.whatsappLink;
      if (waLink && !waLink.startsWith('http')) {
        waLink = `https://wa.me/${waLink.replace(/\D/g, '') || '905350598950'}?text=Merhaba,%20${encodeURIComponent(newCamp.title)}%20hakkında%20bilgi%20almak%20istiyorum.`;
      } else if (!waLink) {
        waLink = `https://wa.me/905350598950?text=Merhaba,%20${encodeURIComponent(newCamp.title)}%20hakkında%20bilgi%20almak%20istiyorum.`;
      }

      const payload = {
        badge: newCamp.badge,
        title: newCamp.title,
        subtitle: newCamp.subtitle,
        image: newCamp.image,
        description: newCamp.description,
        highlights: JSON.stringify(highlightsArray),
        details: JSON.stringify(detailsArray),
        whatsappLink: waLink
      };

      await axios.post('/api/teacher/camps', payload);
      setNewCamp({
        badge: '',
        title: '',
        subtitle: '',
        image: '',
        description: '',
        highlights: '',
        whatsappLink: '',
        tarih: '',
        dersProgrami: '',
        toplamDers: '',
        egitimTuru: 'Online Canlı Eğitim (Zoom)'
      });
      setCampView('list');
      fetchCamps();
      alert('Eğitim kampı başarıyla yayınlandı!');
    } catch (err) {
      alert('Eğitim kampı yayınlanırken hata oluştu.');
    }
  };

  const handleSaveRecording = async (lessonId, recordingUrl) => {
    try {
      await axios.put(`/api/teacher/lessons/${lessonId}/recording`, { recordingUrl });
      fetchLessons();
      setEditingRecordingId(null);
      alert('Ders kayıt bağlantısı güncellendi!');
    } catch (err) {
      alert('Kayıt bağlantısı kaydedilirken hata oluştu.');
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm('Bu dersi silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`/api/teacher/lessons/${lessonId}`);
      fetchLessons();
      alert('Ders başarıyla silindi!');
    } catch (err) {
      alert('Ders silinirken hata oluştu.');
    }
  };

  const handleAutoNotify = async (lessonId) => {
    try {
      const res = await axios.post(`/api/teacher/lessons/${lessonId}/notify`);
      if (res.data.success) {
        alert("Otomatik Bildirim (SMS / WhatsApp) başarıyla gönderildi!");
      } else {
        alert("Bildirim gönderilemedi: " + JSON.stringify(res.data.results));
      }
    } catch (err) {
      alert("Bildirim gönderilirken bir hata oluştu: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteCamp = async (id) => {
    try {
      await axios.delete(`/api/teacher/camps/${id}`);
      fetchCamps();
      setDeleteConfirmCampId(null);
      alert('Kamp silindi.');
    } catch (err) {
      alert('Kamp silinirken hata oluştu.');
    }
  };

  const handleCreateBlog = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/teacher/blog', newBlog);
      setNewBlog({ title: '', content: '', excerpt: '', coverImage: '' });
      setBlogView('list');
      fetchBlogs();
      alert('Blog yazısı başarıyla yayınlandı!');
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      alert(`Blog yazısı yayınlanırken hata oluştu: ${errMsg}`);
    }
  };

  const insertAtCursor = (textToInsert) => {
    const textarea = document.getElementById('blog-content-textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    setNewBlog(prev => ({
      ...prev,
      content: before + textToInsert + after
    }));
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
    }, 10);
  };

  const handleDeleteBlog = async (id) => {
    try {
      await axios.delete(`/api/teacher/blog/${id}`);
      fetchBlogs();
      setDeleteConfirmId(null);
      alert('Blog yazısı silindi.');
    } catch (err) {
      alert('Blog yazısı silinirken hata oluştu.');
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; 
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const daysArray = [];
    for (let i = 0; i < startOffset; i++) {
      daysArray.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      daysArray.push(new Date(year, month, i));
    }
    return daysArray;
  };

  const getLessonsForDate = (date) => {
    if (!date) return [];
    return lessons.filter(lesson => {
      const d = new Date(lesson.date);
      return d.getDate() === date.getDate() &&
             d.getMonth() === date.getMonth() &&
             d.getFullYear() === date.getFullYear();
    });
  };

  return (
    <div className="flex min-h-screen bg-white text-slate-900">
      {/* Side Navigation */}
      <aside className="w-72 border-r border-primary/10 bg-slate-50/50 p-6 flex flex-col gap-8 hidden md:flex">
        <div className="flex items-center gap-3 px-2">
          <img src="/logo.png" alt="Fullematematik Logo" className="h-12 w-12 object-contain" />
          <div>
            <h1 className="text-lg font-black leading-none">Fullematematiği</h1>
            <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">Öğretmen Paneli</p>
          </div>
        </div>
        <nav className="flex flex-col gap-2">
          <button 
            onClick={() => { setActiveTab('dashboard'); setSelectedStudent(null); }}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-slate-500'}`}
          >
            <span className="material-symbols-outlined">grid_view</span>
            <span>Dashboard</span>
          </button>
          <button 
            onClick={() => { setActiveTab('students'); setSelectedStudent(null); }}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'students' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-slate-500'}`}
          >
            <span className="material-symbols-outlined">group</span>
            <span>Öğrencilerim</span>
          </button>
          <button 
            onClick={() => { setActiveTab('new-lesson'); setSelectedStudent(null); }}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'new-lesson' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-slate-500'}`}
          >
            <span className="material-symbols-outlined">calendar_month</span>
            <span>Derslerim</span>
          </button>
          {user?.role === 'HEAD_TEACHER' && (
            <>
              <button 
                onClick={() => { setActiveTab('teachers'); setSelectedStudent(null); }}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'teachers' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-slate-500'}`}
              >
                <span className="material-symbols-outlined">badge</span>
                <span>Öğretmenler</span>
              </button>
              <button 
                onClick={() => { setActiveTab('blog'); setSelectedStudent(null); }}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'blog' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-slate-500'}`}
              >
                <span className="material-symbols-outlined">edit_note</span>
                <span>Blog Yönetimi</span>
              </button>
              <button 
                onClick={() => { setActiveTab('camps'); setSelectedStudent(null); }}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'camps' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-slate-500'}`}
              >
                <span className="material-symbols-outlined">school</span>
                <span>Eğitim Kampları</span>
              </button>
              <button 
                onClick={() => { setActiveTab('forms'); setSelectedStudent(null); }}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'forms' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-slate-500'}`}
              >
                <span className="material-symbols-outlined">forum</span>
                <span>Formdan Gelenler</span>
              </button>
              <button 
                onClick={() => { setActiveTab('payments'); setSelectedStudent(null); }}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'payments' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-slate-500'}`}
              >
                <span className="material-symbols-outlined">payments</span>
                <span>Ödemeler</span>
              </button>
            </>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="h-24 border-b border-primary/5 flex items-center justify-between px-8 sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              {activeTab === 'student-detail' ? `Öğrenci Detayı` : 
               activeTab === 'camps' ? `Kamp Yönetimi` :
               activeTab === 'forms' ? `Form Başvuruları & Sorular` :
               activeTab === 'payments' ? `Ödeme Takip Sistemi` :
               activeTab === 'teachers' ? `Öğretmen Yönetimi` :
               `Hoş Geldiniz, ${user?.name.split(' ')[0]}`}
            </h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Fullematematiği Yönetim Sistemi</p>
          </div>
          <div className="flex items-center gap-4">
            {activeTab === 'teachers' ? (
              <button 
                onClick={() => setShowAddTeacherModal(true)}
                className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">badge</span>
                Yeni Öğretmen
              </button>
            ) : (
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">person_add</span>
                Yeni Öğrenci
              </button>
            )}
          </div>
        </header>

        <div className="p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              
              {/* Statistics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Students Stat */}
                <div className="p-6 bg-primary/5 border border-primary/10 rounded-[24px] flex items-center gap-4 hover:shadow-md transition-all">
                  <div className="p-4 bg-primary text-white rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">group</span>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Toplam Öğrenci</p>
                    <h3 className="text-3xl font-black text-slate-900 mt-0.5">{students.length}</h3>
                  </div>
                </div>

                {/* Lessons Stat */}
                <div className="p-6 bg-blue-50 border border-blue-100 rounded-[24px] flex items-center gap-4 hover:shadow-md transition-all">
                  <div className="p-4 bg-blue-500 text-white rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">calendar_month</span>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Toplam Canlı Ders</p>
                    <h3 className="text-3xl font-black text-slate-900 mt-0.5">{lessons.length}</h3>
                  </div>
                </div>

                {/* Trial Requests Stat */}
                <div className="p-6 bg-amber-50 border border-amber-100 rounded-[24px] flex items-center gap-4 hover:shadow-md transition-all">
                  <div className="p-4 bg-amber-500 text-white rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">school</span>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Bekleyen Talepler</p>
                    <h3 className="text-3xl font-black text-slate-900 mt-0.5">{trialRequests.filter(r => r.status === 'PENDING').length}</h3>
                  </div>
                </div>

                {/* Active Camps Stat */}
                <div className="p-6 bg-purple-50 border border-purple-100 rounded-[24px] flex items-center gap-4 hover:shadow-md transition-all">
                  <div className="p-4 bg-purple-500 text-white rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">campaign</span>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Aktif Kamplar</p>
                    <h3 className="text-3xl font-black text-slate-900 mt-0.5">{campsList.length}</h3>
                  </div>
                </div>

              </div>

              {/* Middle Section: Upcoming Lessons & Quick Links */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Upcoming Lessons Widget */}
                <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 p-6 md:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Yaklaşan Canlı Dersler</h3>
                      <p className="text-xs text-slate-400 font-bold mt-1">Önümüzdeki planlanmış öğrenci dersleri</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-400">event_upcoming</span>
                  </div>

                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                    {getUpcomingLessons().length === 0 ? (
                      <div className="text-center py-12 text-slate-400 font-bold text-sm">Yakın zamanda planlanmış canlı ders bulunmuyor.</div>
                    ) : (
                      getUpcomingLessons().map((lesson) => (
                        <div key={lesson.id} className="p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
                          <div>
                            <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Canlı Ders
                            </span>
                            <h4 className="font-black text-slate-955 text-sm mt-1">{lesson.title}</h4>
                            <p className="text-xs text-slate-500 font-bold mt-1">
                              Öğrenci: <span className="text-slate-800">{lesson.student?.name || 'Tüm Sınıf'}</span>
                            </p>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                              {new Date(lesson.date).toLocaleString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          
                          <div className="flex gap-1.5 w-full sm:w-auto items-center">
                            <button
                              onClick={() => setActiveMeeting(lesson)}
                              className="flex-1 sm:flex-none bg-primary hover:bg-primary/95 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-md shadow-primary/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-base">videocam</span>
                              Dersi Başlat
                            </button>
                            {lesson.student?.studentTel && (
                              <a
                                href={getWhatsAppLink(
                                  lesson.student.studentTel, 
                                  `Merhaba ${lesson.student.name || 'Öğrencimiz'}, "${lesson.title}" canlı dersimiz başlamak üzere. Derse katılmak için tıklayınız: ${window.location.origin}/ogrenci`
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl flex items-center justify-center transition-colors"
                                title="Öğrenciye WhatsApp'tan Ders Başladı Bildirimi Gönder"
                              >
                                <span className="material-symbols-outlined text-base">chat</span>
                              </a>
                            )}
                            {lesson.student?.parentTel && (
                              <a
                                href={getWhatsAppLink(
                                  lesson.student.parentTel,
                                  `Merhaba ${lesson.student.parentName || 'Velimiz'}, öğrencimiz ${lesson.student.name || 'Öğrencimiz'}'in "${lesson.title}" canlı dersi başlamak üzere. Canlı ders takibi için panelinize giriş yapabilirsiniz: ${window.location.origin}/`
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-teal-600 hover:bg-teal-700 text-white p-2.5 rounded-xl flex items-center justify-center transition-colors"
                                title="Veliye WhatsApp'tan Ders Başladı Bildirimi Gönder"
                              >
                                <span className="material-symbols-outlined text-base">group</span>
                              </a>
                            )}
                            <button
                              onClick={() => handleAutoNotify(lesson.id)}
                              className="bg-amber-500 hover:bg-amber-600 text-white p-2.5 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                              title="Sistem Üzerinden Otomatik SMS/WhatsApp Gönder"
                            >
                              <span className="material-symbols-outlined text-base font-bold">notifications_active</span>
                            </button>
                            <button
                              onClick={() => handleDeleteLesson(lesson.id)}
                              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 p-2.5 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                              title="Dersi Sil"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Navigation and Actions widget */}
                <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-100 p-6 md:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Hızlı İşlemler</h3>
                      <p className="text-xs text-slate-400 font-bold mt-1">Sık kullanılan panel kısayolları</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-400">bolt</span>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-primary/5 hover:text-primary rounded-2xl border border-slate-100 font-bold text-sm text-slate-700 transition-all text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">person_add</span>
                        Yeni Öğrenci Kaydet
                      </span>
                      <span className="material-symbols-outlined text-base">chevron_right</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('new-lesson')}
                      className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-primary/5 hover:text-primary rounded-2xl border border-slate-100 font-bold text-sm text-slate-700 transition-all text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">calendar_month</span>
                        Yeni Ders Programla
                      </span>
                      <span className="material-symbols-outlined text-base">chevron_right</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('forms')}
                      className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-primary/5 hover:text-primary rounded-2xl border border-slate-100 font-bold text-sm text-slate-700 transition-all text-left cursor-pointer relative"
                    >
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">forum</span>
                        Gelen Başvuruları Oku
                      </span>
                      {trialRequests.filter(r => r.status === 'PENDING').length > 0 && (
                        <span className="bg-primary text-white text-[9px] px-2 py-0.5 rounded-full font-black ml-2">
                          {trialRequests.filter(r => r.status === 'PENDING').length} Yeni
                        </span>
                      )}
                      <span className="material-symbols-outlined text-base">chevron_right</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('blog')}
                      className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-primary/5 hover:text-primary rounded-2xl border border-slate-100 font-bold text-sm text-slate-700 transition-all text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">edit_note</span>
                        Blog Yazısı Ekle
                      </span>
                      <span className="material-symbols-outlined text-base">chevron_right</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Bottom Section: Recent Students Table & Grade Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Recent Students Table */}
                <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 md:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Son Kayıtlı Öğrenciler</h3>
                      <p className="text-xs text-slate-400 font-bold mt-1">Platforma en son katılan 5 öğrenci</p>
                    </div>
                    <button onClick={() => setActiveTab('students')} className="text-primary text-xs font-black uppercase tracking-widest cursor-pointer">Tümünü Gör</button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-50">
                          <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Öğrenci</th>
                          <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Giriş Kodu</th>
                          <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sınıf</th>
                          <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Veli</th>
                          <th className="pb-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {students.slice(-5).reverse().map(student => (
                          <tr key={student.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => fetchStudentTrials(student)}>
                            <td className="py-3">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm">{student.name.charAt(0)}</div>
                                <div className="font-bold text-slate-900 text-sm">{student.name}</div>
                              </div>
                            </td>
                            <td className="py-3"><code className="bg-slate-100 px-2 py-1 rounded text-primary font-black text-xs">{student.studentCode}</code></td>
                            <td className="py-3 font-bold text-slate-500 text-sm">{(student.grade === 'KPSS' || student.grade === 'Mezun') ? student.grade : `${student.grade}. Sınıf`}</td>
                            <td className="py-3 text-xs text-slate-400 font-medium">{student.parentName || '-'}</td>
                            <td className="py-3 text-right">
                              <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">arrow_forward</span>
                            </td>
                          </tr>
                        ))}
                        {students.length === 0 && (
                          <tr>
                            <td colSpan="5" className="text-center py-6 text-slate-400 font-bold text-sm">Henüz öğrenci bulunmuyor.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Grade Distribution widget */}
                <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-100 p-6 md:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Sınıf Dağılımı</h3>
                      <p className="text-xs text-slate-400 font-bold mt-1">Öğrencilerin sınıf seviyelerine göre oranı</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-400">bar_chart</span>
                  </div>

                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                    {students.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 font-bold text-sm">Öğrenci bulunmuyor.</div>
                    ) : (
                      getGradeDistribution().map(([grade, count]) => {
                        const percent = ((count / students.length) * 100).toFixed(0);
                        return (
                          <div key={grade} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs font-bold">
                              <span className="text-slate-700">{(grade === 'KPSS' || grade === 'Mezun' || grade === 'Diğer') ? grade : `${grade}. Sınıf`}</span>
                              <span className="text-slate-500">{count} Öğrenci ({percent}%)</span>
                            </div>
                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-1000"
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {activeTab === 'students' && (
             <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {students.map(student => (
                    <div key={student.id} onClick={() => fetchStudentTrials(student)} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-black">{student.name.charAt(0)}</div>
                        <div className="flex gap-1.5 items-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditStudentClick(student);
                            }}
                            className="text-slate-300 hover:text-primary transition-colors p-1"
                            title="Düzenle"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStudent(student.id, student.name);
                            }}
                            className="text-slate-300 hover:text-red-500 transition-colors p-1"
                            title="Sil"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                          <div className="flex flex-col items-end gap-1">
                            <code className="text-[9px] font-black bg-slate-50 px-2 py-0.5 rounded text-slate-400">Ö: {student.studentCode}</code>
                            <code className="text-[9px] font-black bg-slate-50 px-2 py-0.5 rounded text-slate-400">V: {student.parentCode || 'Yok'}</code>
                          </div>
                        </div>
                      </div>
                      <h4 className="font-black text-slate-900 text-lg group-hover:text-primary transition-colors">{student.name}</h4>
                      <p className="text-sm text-slate-400 font-bold mb-4">{(student.grade === 'KPSS' || student.grade === 'Mezun') ? student.grade : `${student.grade}. Sınıf`}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl">
                        <span className="material-symbols-outlined text-sm">call</span>
                        {student.parentTel || 'Telefon yok'}
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          )}

          {activeTab === 'student-detail' && selectedStudent && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4">
                  <button onClick={() => setActiveTab('students')} className="h-12 w-12 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary/20 transition-all">
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900">{selectedStudent.name}</h3>
                    <div className="flex gap-4 mt-1">
                      <span className="text-xs font-bold text-primary uppercase tracking-widest">{(selectedStudent.grade === 'KPSS' || selectedStudent.grade === 'Mezun') ? selectedStudent.grade : `${selectedStudent.grade}. Sınıf`}</span>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Öğrenci Kodu: {selectedStudent.studentCode}</span>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Veli Kodu: {selectedStudent.parentCode || 'Yok'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                      <h4 className="font-black text-slate-900 mb-8">Deneme Performansı</h4>
                      <div className="h-64 flex items-end justify-between gap-3 px-2">
                        {studentTrials.map((t, i) => (
                          <div key={i} className="w-full flex flex-col items-center gap-4 group relative">
                            <div className="absolute -top-12 bg-slate-900 text-white text-[10px] px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none shadow-xl">
                              {t.name}: {t.totalNet} Net
                            </div>
                            <div className="w-full bg-primary/10 rounded-2xl relative overflow-hidden h-full">
                              <div className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-xl transition-all duration-1000" style={{ height: `${(t.totalNet / 40) * 100}%` }}></div>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap rotate-45">{t.name.substring(0, 10)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                      <h4 className="font-black text-slate-900 mb-4">Deneme Detayları</h4>
                      {studentTrials.length === 0 ? (
                        <p className="text-slate-500 text-sm font-medium">Bu öğrenciye ait kayıtlı deneme bulunmamaktadır.</p>
                      ) : (
                        <div className="space-y-4">
                          {studentTrials.map(t => (
                            <div key={t.id} className="p-6 bg-slate-50 hover:bg-slate-100/50 rounded-3xl border border-slate-100 transition-all">
                              <div 
                                className="flex items-center justify-between cursor-pointer"
                                onClick={() => setExpandedTrialId(expandedTrialId === t.id ? null : t.id)}
                              >
                                <div>
                                  <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase mb-2 inline-block">{t.type || 'GENEL'}</span>
                                  <h5 className="font-bold text-slate-900">{t.name}</h5>
                                  <p className="text-xs text-slate-400 mt-1">{new Date(t.createdAt).toLocaleDateString('tr-TR')}</p>
                                </div>
                                <div className="text-right flex items-center gap-4">
                                  <div>
                                    <p className="text-xl font-black text-slate-900">{t.totalNet.toFixed(2)}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Toplam Net</p>
                                  </div>
                                  <span className="material-symbols-outlined text-slate-400">
                                    {expandedTrialId === t.id ? 'expand_less' : 'expand_more'}
                                  </span>
                                </div>
                              </div>
                              
                              {expandedTrialId === t.id && (
                                <div className="mt-6 pt-6 border-t border-slate-200/60 space-y-2 animate-in fade-in duration-300">
                                  <div className="grid grid-cols-12 gap-2 text-[10px] font-black text-slate-400 uppercase tracking-wider px-2 pb-2">
                                    <div className="col-span-4">Ders</div>
                                    <div className="col-span-2 text-center">Soru</div>
                                    <div className="col-span-2 text-center">Doğru</div>
                                    <div className="col-span-2 text-center">Yanlış</div>
                                    <div className="col-span-2 text-right">Net</div>
                                  </div>
                                  {Object.entries(t.results || {}).map(([subject, res]) => (
                                    <div key={subject} className="grid grid-cols-12 gap-2 py-2 px-2 hover:bg-slate-200/50 rounded-xl transition-all items-center">
                                      <div className="col-span-4 font-bold text-slate-700 text-xs truncate" title={subject}>{subject}</div>
                                      <div className="col-span-2 text-center font-bold text-slate-600 text-xs">{res.questionCount !== undefined ? res.questionCount : '-'}</div>
                                      <div className="col-span-2 text-center font-bold text-green-600 text-xs">{res.correct}</div>
                                      <div className="col-span-2 text-center font-bold text-red-500 text-xs">{res.wrong}</div>
                                      <div className="col-span-2 text-right font-black text-primary text-xs">
                                        {(() => {
                                          const userGrade = selectedStudent?.grade || "5";
                                          let coef = 0.25;
                                          if (userGrade !== 'KPSS' && userGrade !== 'Mezun') {
                                            const userGradeNum = parseInt(userGrade) || 5;
                                            if (userGradeNum <= 8) {
                                              coef = 1/3;
                                            }
                                          }
                                          const calculatedNet = res.net !== undefined ? res.net : (res.correct - (res.wrong * coef));
                                          return Math.max(0, calculatedNet).toFixed(2);
                                        })()}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="p-8 bg-slate-900 rounded-3xl text-white shadow-2xl">
                      <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">Ortalama Net</p>
                      <h3 className="text-5xl font-black">
                        {studentTrials.length > 0 ? (studentTrials.reduce((acc, curr) => acc + curr.totalNet, 0) / studentTrials.length).toFixed(2) : "0.00"}
                      </h3>
                      <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-xs font-bold">Veli Adı</span>
                          <span className="text-xs font-black">{selectedStudent.parentName || '-'}</span>
                        </div>
                        <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs font-bold">Veli Tel</span>
                            <span className="text-xs font-black text-primary">{selectedStudent.parentTel || '-'}</span>
                          </div>
                          {selectedStudent.parentTel && (
                            <div className="flex justify-end gap-2">
                              <a 
                                href={`tel:${selectedStudent.parentTel}`} 
                                className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
                              >
                                <span className="material-symbols-outlined text-xs">call</span>
                                Ara
                              </a>
                              <a 
                                href={getWhatsAppLink(selectedStudent.parentTel)} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
                              >
                                <span className="material-symbols-outlined text-[14px]">chat</span>
                                WhatsApp
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs font-bold">Öğrenci Tel</span>
                            <span className="text-xs font-black text-primary">{selectedStudent.studentTel || '-'}</span>
                          </div>
                          {selectedStudent.studentTel && (
                            <div className="flex justify-end gap-2">
                              <a 
                                href={`tel:${selectedStudent.studentTel}`} 
                                className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
                              >
                                <span className="material-symbols-outlined text-xs">call</span>
                                Ara
                              </a>
                              <a 
                                href={getWhatsAppLink(selectedStudent.studentTel)} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
                              >
                                <span className="material-symbols-outlined text-[14px]">chat</span>
                                WhatsApp
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs font-bold">Verilen Hizmet</span>
                            <span className="text-xs font-black text-white">{selectedStudent.serviceProvided || '-'}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs font-bold">Ödeme Durumu</span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              selectedStudent.paymentStatus === 'PAID' ? 'bg-emerald-500/20 text-emerald-300' :
                              selectedStudent.paymentStatus === 'PARTIAL' ? 'bg-amber-500/20 text-amber-300' :
                              'bg-rose-500/20 text-rose-300'
                            }`}>
                              {selectedStudent.paymentStatus === 'PAID' ? 'Ödendi' :
                               selectedStudent.paymentStatus === 'PARTIAL' ? 'Kısmi' :
                               'Ödenmedi'}
                            </span>
                          </div>
                          {selectedStudent.paymentAmount && (
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400 font-medium">
                                {selectedStudent.paymentType === 'LESSON' ? 'Paket Ücreti' : 'Aylık Ücret'}
                              </span>
                              <span className="font-black text-slate-200">{selectedStudent.paymentAmount}</span>
                            </div>
                          )}
                          {selectedStudent.paymentType === 'LESSON' ? (
                            selectedStudent.totalLessons > 0 && (
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-medium">Toplam Ders</span>
                                <span className="font-black text-slate-200">{selectedStudent.totalLessons} Ders</span>
                              </div>
                            )
                          ) : (
                            selectedStudent.paymentDay && (
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-medium">Ödeme Günü</span>
                                <span className="font-black text-slate-200">{selectedStudent.paymentDay}</span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
             </div>
          )}

          {activeTab === 'new-lesson' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Calendar */}
              <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-900">
                    {trMonths[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                      className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-primary transition-all flex items-center justify-center border border-slate-100"
                    >
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <button 
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                      className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-primary transition-all flex items-center justify-center border border-slate-100"
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-xs font-black text-slate-400 uppercase tracking-wider">
                  {trDays.map(day => <div key={day} className="py-2">{day}</div>)}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {getDaysInMonth().map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} className="aspect-square bg-slate-50/20 rounded-2xl"></div>;
                    
                    const isSelected = selectedDate && 
                      day.getDate() === selectedDate.getDate() &&
                      day.getMonth() === selectedDate.getMonth() &&
                      day.getFullYear() === selectedDate.getFullYear();
                    
                    const dayLessons = getLessonsForDate(day);
                    const hasLessons = dayLessons.length > 0;
                    const hasPendingRequest = dayLessons.some(l => l.recordingRequested && !l.recordingUrl);
                    
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all group ${
                          isSelected 
                            ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' 
                            : 'hover:bg-primary/5 hover:scale-[1.02] border border-slate-50'
                        }`}
                      >
                        <span className="font-bold text-sm">{day.getDate()}</span>
                        {hasLessons && (
                          <>
                            <span className={`absolute bottom-2 h-1.5 w-1.5 rounded-full ${
                              isSelected 
                                ? 'bg-white' 
                                : hasPendingRequest 
                                  ? 'bg-red-500' 
                                  : 'bg-primary'
                            }`}></span>
                            {hasPendingRequest && !isSelected && (
                              <span className="absolute bottom-2 h-1.5 w-1.5 rounded-full bg-red-500 animate-ping"></span>
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected Day Details and Add Form */}
              <div className="lg:col-span-5 space-y-6">
                {/* Selected Day Lessons List */}
                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest">
                      {selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </h4>
                    <span className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full font-black">
                      {getLessonsForDate(selectedDate).length} Ders
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                    {getLessonsForDate(selectedDate).length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400 font-bold uppercase tracking-wide">
                        Bu güne planlanmış ders bulunmuyor.
                      </div>
                    ) : (
                      getLessonsForDate(selectedDate).map(lesson => (
                        <div key={lesson.id} className="p-4 bg-white rounded-2xl border border-slate-100 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="font-bold text-slate-900 text-sm">{lesson.title}</h5>
                                <span className="bg-slate-100 text-slate-650 px-2 py-0.5 rounded-md text-[10px] font-extrabold border border-slate-200 shadow-sm">
                                  ID: {lesson.id}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-[10px] text-primary font-black bg-primary/5 px-2 py-0.5 rounded-md">
                                  {new Date(lesson.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {lesson.student && (
                                  <span className="text-[10px] text-slate-400 font-bold">
                                    Öğrenci: {lesson.student.name}
                                  </span>
                                )}
                                {lesson.recordingRequested && !lesson.recordingUrl && (
                                  <span className="text-[10px] text-red-600 font-black bg-red-50 border border-red-100 px-2 py-0.5 rounded-md animate-pulse">
                                    Kayıt İstendi!
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button 
                                onClick={() => setActiveMeeting(lesson)}
                                className="bg-primary hover:bg-primary/95 text-white px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                Derse Başla
                              </button>

                              {lesson.student?.studentTel && (
                                <a
                                  href={getWhatsAppLink(
                                    lesson.student.studentTel, 
                                    `Merhaba ${lesson.student.name || 'Öğrencimiz'}, "${lesson.title}" canlı dersimiz başlamak üzere. Derse katılmak için tıklayınız: ${window.location.origin}/ogrenci`
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl flex items-center justify-center transition-colors"
                                  title="Öğrenciye WhatsApp'tan Ders Başladı Bildirimi Gönder"
                                >
                                  <span className="material-symbols-outlined text-base">chat</span>
                                </a>
                              )}
                              {lesson.student?.parentTel && (
                                <a
                                  href={getWhatsAppLink(
                                    lesson.student.parentTel,
                                    `Merhaba ${lesson.student.parentName || 'Velimiz'}, öğrencimiz ${lesson.student.name || 'Öğrencimiz'}'in "${lesson.title}" canlı dersi başlamak üzere. Canlı ders takibi için panelinize giriş yapabilirsiniz: ${window.location.origin}/`
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-teal-600 hover:bg-teal-700 text-white p-2 rounded-xl flex items-center justify-center transition-colors"
                                  title="Veliye WhatsApp'tan Ders Başladı Bildirimi Gönder"
                                >
                                  <span className="material-symbols-outlined text-base">group</span>
                                </a>
                              )}
                              <button
                                onClick={() => handleAutoNotify(lesson.id)}
                                className="bg-amber-500 hover:bg-amber-600 text-white p-2 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                                title="Sistem Üzerinden Otomatik SMS/WhatsApp Gönder"
                              >
                                <span className="material-symbols-outlined text-base font-bold">notifications_active</span>
                              </button>
                              
                              <button 
                                onClick={() => {
                                  setEditingRecordingId(lesson.id);
                                  setRecordingUrlInput(lesson.recordingUrl || '');
                                }}
                                className={`px-2.5 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                  lesson.recordingUrl 
                                    ? 'bg-green-50 hover:bg-green-100 text-green-600 border border-green-100' 
                                    : lesson.recordingRequested
                                      ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 animate-pulse'
                                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100'
                                }`}
                                title={lesson.recordingUrl ? "Kayıt Var (Düzenle)" : lesson.recordingRequested ? "Kayıt İstendi (Ekle)" : "Kayıt Ekle"}
                              >
                                <span className="material-symbols-outlined text-base">video_library</span>
                              </button>

                              <button 
                                onClick={() => handleDeleteLesson(lesson.id)}
                                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 px-2.5 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer"
                                title="Dersi Sil"
                              >
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            </div>
                          </div>

                          {editingRecordingId === lesson.id && (
                            <div className="bg-slate-50 p-3 rounded-xl space-y-2 border border-slate-100 animate-in fade-in duration-200">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Ders Kayıt Yolu veya Bağlantısı (Otomatik Kayıt: /uploads/lesson_{lesson.id}.webm)</label>
                              <div className="flex gap-2">
                                <input 
                                  type="text"
                                  placeholder={`/uploads/lesson_${lesson.id}.webm`}
                                  value={recordingUrlInput}
                                  onChange={(e) => setRecordingUrlInput(e.target.value)}
                                  className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none focus:border-primary text-slate-700 font-bold"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveRecording(lesson.id, recordingUrlInput)}
                                  className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/90"
                                >
                                  Kaydet
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingRecordingId(null)}
                                  className="bg-white border border-slate-200 text-slate-500 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50"
                                >
                                  İptal
                                </button>
                              </div>
                              <p className="text-[9px] text-slate-400 leading-normal">
                                Canlı ders sonlandırıldığında sistem bu kaydı otomatik oluşturur. İhtiyacınız olursa manuel dosya yolu veya harici link düzenleyebilirsiniz.
                              </p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Create Lesson Form */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <h4 className="font-black text-slate-900 mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">calendar_add_on</span>
                    Yeni Ders Planla
                  </h4>
                  <form onSubmit={handleCreateLesson} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Öğrenci Seçimi (Birden fazla seçebilirsiniz)</label>
                      <div className="max-h-48 overflow-y-auto border border-primary/10 bg-slate-50/50 rounded-2xl p-3 space-y-1.5">
                        {students.map(student => {
                          const isChecked = selectedStudentIds.includes(student.id);
                          return (
                            <label key={student.id} className="flex items-center gap-3 px-3 py-2 hover:bg-white rounded-xl cursor-pointer transition-all border border-transparent hover:border-slate-100 select-none">
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedStudentIds(prev => 
                                    prev.includes(student.id) 
                                      ? prev.filter(id => id !== student.id) 
                                      : [...prev, student.id]
                                  );
                                }}
                                className="rounded text-primary focus:ring-primary/20 h-4.5 w-4.5 cursor-pointer"
                              />
                              <span className="text-sm font-bold text-slate-800">
                                {student.name} <span className="text-xs text-slate-400">({(student.grade === 'KPSS' || student.grade === 'Mezun') ? student.grade : `${student.grade}. Sınıf`})</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ders Başlığı</label>
                      <input 
                        className="w-full rounded-2xl border border-primary/10 bg-slate-50/50 px-4 py-3.5 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" 
                        placeholder="Örn: TYT Fonksiyonlar" 
                        value={newLesson.title} 
                        onChange={(e) => setNewLesson({...newLesson, title: e.target.value})} 
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Saat</label>
                      <input 
                        type="time" 
                        className="w-full rounded-2xl border border-primary/10 bg-slate-50/50 px-4 py-3.5 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" 
                        value={lessonTime} 
                        onChange={(e) => setLessonTime(e.target.value)} 
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ders Linki (Zoom, Meet vb.)</label>
                      <input 
                        className="w-full rounded-2xl border border-primary/10 bg-slate-50/50 px-4 py-3.5 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" 
                        placeholder="https://zoom.us/j/... veya Google Meet linki" 
                        value={newLessonZoomUrl} 
                        onChange={(e) => setNewLessonZoomUrl(e.target.value)} 
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] hover:shadow-xl transition-all text-sm mt-2"
                    >
                      Dersi Kaydet
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'blog' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {blogView === 'list' ? (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-3xl font-black text-slate-900">Blog Yazıları</h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Yayınlanmış içeriklerinizi buradan yönetin</p>
                    </div>
                    <button 
                      onClick={() => setBlogView('create')}
                      className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">add</span>
                      Yeni Yazı Ekle
                    </button>
                  </div>

                  {/* Blog Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {blogs.length === 0 ? (
                      <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                        <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">drafts</span>
                        <h3 className="text-lg font-bold text-slate-700">Yayınlanmış Yazı Yok</h3>
                        <p className="text-sm text-slate-400 mt-1">Henüz yayınlanmış bir blog yazısı bulunmuyor.</p>
                      </div>
                    ) : (
                      blogs.map(post => (
                        <div key={post.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all flex flex-col justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start gap-4">
                              <h4 className="font-black text-slate-900 text-lg line-clamp-2">{post.title}</h4>
                              {deleteConfirmId !== post.id ? (
                                <button 
                                  onClick={() => setDeleteConfirmId(post.id)}
                                  className="text-red-500 hover:text-red-700 p-2 flex items-center justify-center rounded-xl hover:bg-red-50 transition-colors shrink-0"
                                  title="Yazıyı Sil"
                                >
                                  <span className="material-symbols-outlined">delete</span>
                                </button>
                              ) : (
                                <div className="flex gap-2 items-center shrink-0">
                                  <button 
                                    onClick={() => handleDeleteBlog(post.id)}
                                    className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-xl font-bold hover:bg-red-600 transition-colors"
                                  >
                                    Sil
                                  </button>
                                  <button 
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="bg-slate-100 text-slate-500 text-xs px-3 py-1.5 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                                  >
                                    İptal
                                  </button>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">
                              Slug: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 lowercase font-normal">{post.slug}</code> • {new Date(post.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <p className="text-sm text-slate-500 line-clamp-3">{post.excerpt}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-lg p-8 md:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Form Header */}
                  <div className="flex justify-between items-center border-b border-slate-100 pb-6 mb-8">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => { setBlogView('list'); setDeleteConfirmId(null); }}
                        className="h-12 w-12 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary/20 transition-all"
                      >
                        <span className="material-symbols-outlined">arrow_back</span>
                      </button>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900">Yeni Blog Yazısı</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Tam ekran editör deneyimi</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => { setBlogView('list'); setDeleteConfirmId(null); }}
                        className="px-6 py-3 border border-slate-200 text-slate-500 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
                      >
                        Vazgeç
                      </button>
                      <button 
                        onClick={handleCreateBlog}
                        className="bg-primary text-white px-8 py-3 rounded-2xl font-black text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-lg">publish</span>
                        Yayınla
                      </button>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <form onSubmit={handleCreateBlog} className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Yazı Başlığı</label>
                      <input 
                        className="w-full text-3xl font-black outline-none border-b border-slate-100 pb-4 focus:border-primary/30 transition-colors placeholder:text-slate-200" 
                        placeholder="Yazı Başlığı Girin..." 
                        value={newBlog.title} 
                        onChange={(e) => setNewBlog({...newBlog, title: e.target.value})} 
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kısa Özet (Arama sonuçları ve kartlar için)</label>
                      <input 
                        className="w-full text-lg text-slate-500 outline-none border-b border-slate-100 pb-3 focus:border-primary/20 transition-colors placeholder:text-slate-300 font-bold" 
                        placeholder="Yazı hakkında 1-2 cümlelik kısa özet girin..." 
                        value={newBlog.excerpt} 
                        onChange={(e) => setNewBlog({...newBlog, excerpt: e.target.value})}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center ml-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Kapak Görseli</label>
                        {newBlog.coverImage && (
                          <span className="text-[10px] font-bold text-green-500 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-xs">check_circle</span>
                            Kapak Görseli Seçildi
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center w-full">
                        <div className="flex-1 w-full flex items-center gap-3 border-b border-slate-100 pb-2 focus-within:border-primary/30 transition-colors">
                          <input 
                            type="url"
                            className="flex-1 text-sm text-slate-600 outline-none placeholder:text-slate-300 font-bold" 
                            placeholder="Kapak görseli URL'si yapıştırın veya cihazınızdan yükleyin..." 
                            value={newBlog.coverImage} 
                            onChange={(e) => setNewBlog({...newBlog, coverImage: e.target.value})}
                          />
                          <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-200 shadow-sm">
                            <span className="material-symbols-outlined text-sm">upload_file</span>
                            Cihazdan Seç
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  handleImageUpload(file, (base64) => {
                                    setNewBlog({...newBlog, coverImage: base64});
                                  });
                                }
                              }}
                            />
                          </label>
                        </div>
                        {newBlog.coverImage && (
                          <div className="relative h-14 w-24 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0 shadow-sm animate-in zoom-in-95 duration-200">
                            <img src={newBlog.coverImage} alt="Kapak Önizleme" className="h-full w-full object-cover" />
                            <button 
                              type="button" 
                              onClick={() => setNewBlog({...newBlog, coverImage: ''})}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors flex items-center justify-center w-4 h-4 shadow"
                            >
                              <span className="material-symbols-outlined text-[10px] font-bold">close</span>
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Presets */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {BLOG_IMAGE_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => setNewBlog({...newBlog, coverImage: preset.url})}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                              newBlog.coverImage === preset.url 
                                ? 'bg-primary/10 border-primary text-primary shadow-sm' 
                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center ml-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">İçerik (HTML veya Düz Metin)</label>
                        <button
                          type="button"
                          onClick={() => setInsertImgOpen(!insertImgOpen)}
                          className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors px-2.5 py-1.5 rounded-xl bg-primary/5 border border-primary/10"
                        >
                          <span className="material-symbols-outlined text-sm">image</span>
                          İçeriğe Görsel Ekle
                        </button>
                      </div>

                      {insertImgOpen && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                          <p className="text-xs font-bold text-slate-500">Yazı içerisine yerleştirmek istediğiniz görselin bağlantısını girin veya hazır bir görsel seçin:</p>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input 
                              type="url"
                              id="insert-image-url-input"
                              placeholder="Görsel bağlantısı yapıştırın veya sağdaki butondan dosya seçin..."
                              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:border-primary placeholder:text-slate-300"
                            />
                            <div className="flex gap-2 justify-end">
                              <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border border-slate-200 shadow-sm flex-shrink-0">
                                <span className="material-symbols-outlined text-sm">upload_file</span>
                                Cihazdan Seç
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                      handleImageUpload(file, (base64) => {
                                        const input = document.getElementById('insert-image-url-input');
                                        if (input) {
                                          input.value = base64;
                                        }
                                      });
                                    }
                                  }}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.getElementById('insert-image-url-input');
                                  if (input && input.value) {
                                    insertAtCursor(`<img src="${input.value}" class="w-full rounded-2xl my-6 object-cover shadow-md" alt="Görsel" />\n`);
                                    input.value = '';
                                    setInsertImgOpen(false);
                                  }
                                }}
                                className="bg-primary text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-primary/95 transition-colors shadow-sm"
                              >
                                Ekle
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1 items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase mr-1">Hazır Resimler:</span>
                            {BLOG_IMAGE_PRESETS.map((preset) => (
                              <button
                                key={`body-${preset.name}`}
                                type="button"
                                onClick={() => {
                                  insertAtCursor(`<img src="${preset.url}" class="w-full rounded-2xl my-6 object-cover shadow-md" alt="${preset.name}" />\n`);
                                  setInsertImgOpen(false);
                                }}
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-500 transition-colors shadow-sm"
                              >
                                {preset.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <textarea 
                        id="blog-content-textarea"
                        className="w-full min-h-[450px] text-base text-slate-700 outline-none resize-none font-medium placeholder:text-slate-200" 
                        placeholder="Matematik serüveninizi ve bilgilerinizi buraya yazın... (Zengin metin için HTML etiketleri de kullanabilirsiniz)" 
                        value={newBlog.content} 
                        onChange={(e) => setNewBlog({...newBlog, content: e.target.value})} 
                        required
                      />
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'camps' && (
            <div className="p-8">
              {campView === 'list' ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[32px] border border-primary/5">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Aktif Eğitim Kampları</h3>
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Sitede yayında olan tüm kampları yönetin</p>
                    </div>
                    <button
                      onClick={() => setCampView('create')}
                      className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">add</span>
                      Yeni Kamp Ekle
                    </button>
                  </div>

                  {campsList.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
                      <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">school</span>
                      <h3 className="text-lg font-bold text-slate-700">Henüz Kamp Bulunmuyor</h3>
                      <p className="text-sm text-slate-400 mt-1">Yayınlanmış herhangi bir eğitim kampı bulunmamaktadır.</p>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                      {campsList.map((camp) => (
                        <div key={camp.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex gap-5 items-start">
                          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-50 flex-shrink-0">
                            <img src={camp.image} alt={camp.title} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="inline-block text-[10px] font-black text-primary uppercase bg-primary/5 px-2 py-0.5 rounded-full mb-1">{camp.badge}</span>
                            <h4 className="font-bold text-slate-900 truncate text-base">{camp.title}</h4>
                            <p className="text-xs text-slate-400 truncate mt-0.5">{camp.subtitle}</p>
                            
                            <div className="mt-4 flex items-center justify-end">
                              {deleteConfirmCampId === camp.id ? (
                                <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded-xl border border-red-100 animate-in fade-in duration-200">
                                  <span className="text-xs font-bold text-red-600 px-2">Emin misiniz?</span>
                                  <button 
                                    onClick={() => handleDeleteCamp(camp.id)}
                                    className="bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-700"
                                  >
                                    Evet, Sil
                                  </button>
                                  <button 
                                    onClick={() => setDeleteConfirmCampId(null)}
                                    className="bg-white text-slate-500 border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-50"
                                  >
                                    Vazgeç
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => setDeleteConfirmCampId(camp.id)}
                                  className="text-red-500 hover:text-red-600 transition-colors flex items-center gap-1 text-xs font-bold"
                                >
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                  Kampı Sil
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Distraction-free Camp Creator */
                <div className="bg-white rounded-[40px] border border-slate-100 p-8 md:p-12 shadow-sm max-w-4xl mx-auto space-y-8">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-6">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => { setCampView('list'); setDeleteConfirmCampId(null); }}
                        className="h-10 w-10 rounded-full hover:bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 hover:text-primary transition-all"
                      >
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                      </button>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900">Yeni Kamp Yayınla</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Kart kapak resmi ve kamp detaylarını girin</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => { setCampView('list'); setDeleteConfirmCampId(null); }}
                        className="px-6 py-3 border border-slate-200 text-slate-500 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
                      >
                        Vazgeç
                      </button>
                      <button 
                        onClick={handleCreateCamp}
                        className="bg-primary text-white px-8 py-3 rounded-2xl font-black text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-lg">publish</span>
                        Yayınla
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleCreateCamp} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kamp Başlığı (Karttaki Kalın Yazı)</label>
                        <input 
                          className="w-full text-base font-bold outline-none border-b border-slate-100 pb-2 focus:border-primary/20 transition-colors placeholder:text-slate-200 font-bold text-slate-700" 
                          placeholder="Örn: Ortaokul Yeni Nesil Soru Çözüm Kampı" 
                          value={newCamp.title} 
                          onChange={(e) => setNewCamp({...newCamp, title: e.target.value})} 
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kamp Alt Başlığı (Karttaki Açıklayıcı Cümle)</label>
                        <input 
                          className="w-full text-base font-bold outline-none border-b border-slate-100 pb-2 focus:border-primary/20 transition-colors placeholder:text-slate-200 font-bold text-slate-700" 
                          placeholder="Örn: LGS ve Okul Sınavları İçin Sağlam Altyapı" 
                          value={newCamp.subtitle} 
                          onChange={(e) => setNewCamp({...newCamp, subtitle: e.target.value})} 
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kart Rozeti / Hedef Kitle</label>
                        <input 
                          className="w-full text-base font-bold outline-none border-b border-slate-100 pb-2 focus:border-primary/20 transition-colors placeholder:text-slate-200 font-bold text-slate-700" 
                          placeholder="Örn: 5, 6, 7 ve 8. Sınıflar" 
                          value={newCamp.badge} 
                          onChange={(e) => setNewCamp({...newCamp, badge: e.target.value})} 
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp Kayıt Numarası veya Link (Opsiyonel)</label>
                        <input 
                          className="w-full text-base font-bold outline-none border-b border-slate-100 pb-2 focus:border-primary/20 transition-colors placeholder:text-slate-200 font-bold text-slate-700" 
                          placeholder="Boş bırakılırsa ana iletişim numarası kullanılır" 
                          value={newCamp.whatsappLink} 
                          onChange={(e) => setNewCamp({...newCamp, whatsappLink: e.target.value})} 
                        />
                      </div>
                    </div>

                    {/* Camp Cover Image */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center ml-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Kart Kapağı (Görsel)</label>
                        {newCamp.image && (
                          <span className="text-[10px] font-bold text-green-500 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-xs">check_circle</span>
                            Kapak Görseli Seçildi
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                        <div className="flex-1 w-full flex items-center gap-3 border-b border-slate-100 pb-2 focus-within:border-primary/30 transition-colors">
                          <input 
                            type="url"
                            className="flex-1 text-sm text-slate-600 outline-none placeholder:text-slate-300 font-bold" 
                            placeholder="Görsel URL'si yapıştırın veya cihazınızdan yükleyin..." 
                            value={newCamp.image} 
                            onChange={(e) => setNewCamp({...newCamp, image: e.target.value})}
                          />
                          <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-200 shadow-sm">
                            <span className="material-symbols-outlined text-sm">upload_file</span>
                            Cihazdan Seç
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  handleImageUpload(file, (base64) => {
                                    setNewCamp({...newCamp, image: base64});
                                  });
                                }
                              }}
                            />
                          </label>
                        </div>
                        {newCamp.image && (
                          <div className="relative h-14 w-24 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0 shadow-sm">
                            <img src={newCamp.image} alt="Kapak Önizleme" className="h-full w-full object-cover" />
                            <button 
                              type="button" 
                              onClick={() => setNewCamp({...newCamp, image: ''})}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors flex items-center justify-center w-4 h-4 shadow"
                            >
                              <span className="material-symbols-outlined text-[10px] font-bold">close</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Details Grid (Tarih, Program, vs.) */}
                    <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6 space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kart Detay Bilgileri (Görünüm Kutucukları)</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Kamp Tarihi</label>
                          <input 
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-primary/30 text-slate-700 font-bold" 
                            placeholder="Örn: 3 Temmuz - 6 Eylül" 
                            value={newCamp.tarih}
                            onChange={(e) => setNewCamp({...newCamp, tarih: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Ders Programı</label>
                          <input 
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-primary/30 text-slate-700 font-bold" 
                            placeholder="Örn: Haftada 4 Ders" 
                            value={newCamp.dersProgrami}
                            onChange={(e) => setNewCamp({...newCamp, dersProgrami: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Toplam Canlı Ders</label>
                          <input 
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-primary/30 text-slate-700 font-bold" 
                            placeholder="Örn: 18 Canlı Ders" 
                            value={newCamp.toplamDers}
                            onChange={(e) => setNewCamp({...newCamp, toplamDers: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Eğitim Türü</label>
                          <input 
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-primary/30 text-slate-700 font-bold" 
                            placeholder="Örn: Online Canlı Eğitim (Zoom)" 
                            value={newCamp.egitimTuru}
                            onChange={(e) => setNewCamp({...newCamp, egitimTuru: e.target.value})}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kamp Genel Detay Açıklaması</label>
                      <textarea 
                        className="w-full min-h-[120px] text-sm text-slate-700 outline-none border-b border-slate-100 resize-none font-medium placeholder:text-slate-200 font-bold text-slate-600" 
                        placeholder="Örn: Ders kayıtları Google Drive üzerinden paylaşılacak ve öğrenciler istedikleri zaman tekrar izleyebilecektir..." 
                        value={newCamp.description} 
                        onChange={(e) => setNewCamp({...newCamp, description: e.target.value})} 
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Neler Kazanacaksınız? (Her kazanımı ayrı satıra yazın)</label>
                      <textarea 
                        className="w-full min-h-[150px] text-sm text-slate-700 outline-none border-b border-slate-100 resize-none font-medium placeholder:text-slate-200 font-bold text-slate-600" 
                        placeholder="Örn:&#10;Yeni nesil soru mantığını öğren&#10;Matematiksel yorumlama becerini geliştir&#10;Temel eksiklerini tamamla" 
                        value={newCamp.highlights} 
                        onChange={(e) => setNewCamp({...newCamp, highlights: e.target.value})} 
                        required
                      />
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'forms' && (
            <div className="p-8 space-y-8 animate-in fade-in duration-300">
              
              {/* Header Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-primary font-black uppercase tracking-widest">Tanışma Dersi</p>
                    <h3 className="text-3xl font-black mt-1 text-slate-900">{trialRequests.filter(r => r.status === 'PENDING').length} Bekleyen</h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">Toplam {trialRequests.length} başvuru</p>
                  </div>
                  <span className="material-symbols-outlined text-5xl text-primary/30">school</span>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Soru & Mesajlar</p>
                    <h3 className="text-3xl font-black mt-1 text-slate-900">{contactMessages.length} İleti</h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">Ana sayfa iletişim formundan gelenler</p>
                  </div>
                  <span className="material-symbols-outlined text-5xl text-blue-300/40">forum</span>
                </div>
              </div>

              {/* Success Approved Notification Card */}
              {approvedRequestResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-[30px] p-8 space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-2xl">check_circle</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-black text-slate-900">Ders Başarıyla Planlandı!</h4>
                      <p className="text-sm text-slate-600 mt-1">
                        <strong>{approvedRequestResult.studentName}</strong> için ücretsiz tanışma dersi oluşturuldu ve öğrenci hesabı aktifleştirildi.
                      </p>
                      
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-emerald-100">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Öğrenci Kodu</span>
                          <strong className="text-slate-800 font-black text-lg">{approvedRequestResult.studentCode}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Ders Tarihi & Saati</span>
                          <strong className="text-slate-800 font-bold text-sm">{approvedRequestResult.scheduledDate} - {approvedRequestResult.scheduledTime}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Geçici Şifre</span>
                          <strong className="text-slate-800 font-bold text-sm">student</strong>
                        </div>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-4">
                        <a
                          href={approvedRequestResult.whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02]"
                        >
                          <span className="material-symbols-outlined text-base">chat</span>
                          WhatsApp ile Bilgilendir
                        </a>
                        <button
                          onClick={() => setApprovedRequestResult(null)}
                          className="border border-slate-200 hover:bg-slate-50 text-slate-600 px-6 py-3 rounded-2xl font-black text-sm transition-all"
                        >
                          Kapat
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left side: Trial Requests */}
                <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 p-6 md:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Tanışma Dersi Talepleri</h3>
                      <p className="text-xs text-slate-400 font-bold mt-1">Öğrenci adaylarının deneme dersi başvuruları</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-400">school</span>
                  </div>

                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {trialRequests.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 font-bold">Herhangi bir başvuru bulunmamaktadır.</div>
                    ) : (
                      trialRequests.map((req) => (
                        <div key={req.id} className="border border-slate-100 rounded-2xl p-5 hover:border-primary/20 hover:shadow-sm transition-all space-y-4 bg-slate-50/30">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-slate-900">{req.studentName}</h4>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                                  req.type === 'CHILD' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-primary'
                                }`}>
                                  {req.type === 'CHILD' ? 'Veli (Çocuğu için)' : 'Kendisi için'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 font-medium mt-1">{req.email} • {req.phone}</p>
                              <p className="text-xs font-bold text-primary mt-1">Sınıf/Seviye: {(req.grade === 'KPSS' || req.grade === 'Mezun') ? req.grade : `${req.grade}. Sınıf`}</p>
                            </div>

                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl tracking-wider ${
                              req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' :
                              req.status === 'REJECTED' ? 'bg-red-50 text-red-600' :
                              'bg-amber-50 text-amber-600'
                            }`}>
                              {req.status === 'APPROVED' ? 'Kabul Edildi' :
                               req.status === 'REJECTED' ? 'Reddedildi' :
                               'Beklemede'}
                            </span>
                          </div>

                          {/* Inline Scheduler Box */}
                          {selectedRequestForSchedule === req.id && (
                            <div className="bg-white border border-primary/20 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                              <h5 className="text-xs font-black text-slate-900 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm text-primary">calendar_month</span>
                                Tanışma Dersi Planlama
                              </h5>
                              
                              {/* Reference Calendar View */}
                              <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Planlı Dersler Referansı</p>
                                <div className="text-xs max-h-32 overflow-y-auto space-y-1.5">
                                  {lessons.filter(l => {
                                    const lDate = new Date(l.date);
                                    const today = new Date();
                                    return lDate >= today;
                                  }).slice(0, 5).map(l => (
                                    <div key={l.id} className="flex justify-between items-center text-slate-600 bg-white px-2.5 py-1.5 rounded-lg border border-slate-100">
                                      <span className="font-semibold">{l.title} ({l.student?.name || 'Genel'})</span>
                                      <span className="text-[10px] font-bold">{new Date(l.date).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                  ))}
                                  {lessons.filter(l => new Date(l.date) >= new Date()).length === 0 && (
                                    <p className="text-slate-400 italic">Yaklaşan ders bulunmuyor.</p>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Tarih Seçin</label>
                                  <input
                                    type="date"
                                    required
                                    value={scheduledDateInput}
                                    onChange={(e) => setScheduledDateInput(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-primary text-slate-800"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Saat Seçin</label>
                                  <input
                                    type="time"
                                    required
                                    value={scheduledTimeInput}
                                    onChange={(e) => setScheduledTimeInput(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-primary text-slate-800"
                                  />
                                </div>
                              </div>

                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => setSelectedRequestForSchedule(null)}
                                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                                >
                                  Vazgeç
                                </button>
                                <button
                                  onClick={() => handleApproveTrialRequest(req.id)}
                                  className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors"
                                >
                                  Onayla ve Planla
                                </button>
                              </div>
                            </div>
                          )}

                          {req.status === 'PENDING' && selectedRequestForSchedule !== req.id && (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleRejectTrialRequest(req.id)}
                                className="px-3.5 py-2 text-xs font-bold border border-slate-200 text-slate-500 rounded-xl hover:bg-red-55 hover:text-red-600 hover:border-red-100 transition-colors"
                              >
                                Reddet
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRequestForSchedule(req.id);
                                  const todayStr = new Date().toISOString().split('T')[0];
                                  setScheduledDateInput(todayStr);
                                }}
                                className="px-4 py-2 text-xs font-bold bg-primary text-white rounded-xl shadow-md shadow-primary/10 hover:bg-primary/95 transition-all"
                              >
                                Kabul Et & Ders Planla
                              </button>
                            </div>
                          )}

                          {req.status === 'APPROVED' && req.scheduledDate && (
                            <div className="text-xs bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 flex justify-between items-center text-slate-700">
                              <div>
                                <span className="font-semibold text-emerald-700">Onaylandı ve Planlandı</span>
                                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                  Ders: {new Date(req.scheduledDate).toLocaleString('tr-TR')}
                                </p>
                              </div>
                              <a
                                href={getWhatsAppLink(req.phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg flex items-center justify-center transition-colors"
                                title="WhatsApp'tan iletişime geç"
                              >
                                <span className="material-symbols-outlined text-sm">chat</span>
                              </a>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right side: Contact Messages */}
                <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-100 p-6 md:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">İletişim Mesajları</h3>
                      <p className="text-xs text-slate-400 font-bold mt-1">"Sorularınız mı var?" formundan gelen iletiler</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-400">forum</span>
                  </div>

                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {contactMessages.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 font-bold">Mesaj kutusu boş.</div>
                    ) : (
                      contactMessages.map((msg) => (
                        <div key={msg.id} className="border border-slate-100 rounded-2xl p-5 hover:border-primary/20 transition-all space-y-3 bg-slate-50/30 relative group">
                          <button
                            onClick={() => handleDeleteContactMessage(msg.id)}
                            className="absolute right-4 top-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Sil"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                          
                          <div>
                            <h4 className="font-black text-slate-900 text-sm">{msg.name}</h4>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                              {new Date(msg.createdAt).toLocaleString('tr-TR')}
                            </p>
                          </div>
                          
                          <div className="text-xs text-slate-600 bg-white border border-slate-100 p-3 rounded-xl leading-relaxed">
                            {msg.message || <span className="italic text-slate-300">İçerik belirtilmemiş.</span>}
                          </div>

                          <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                            <a href={`tel:${msg.phone}`} className="hover:text-primary transition-colors flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">call</span>
                              Arayın
                            </a>
                            <a href={`mailto:${msg.email}`} className="hover:text-primary transition-colors flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">mail</span>
                              E-posta
                            </a>
                            <a
                              href={getWhatsAppLink(msg.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-emerald-600 transition-colors flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm">chat</span>
                              WhatsApp
                            </a>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Stats Bar */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">group</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Toplam Öğrenci</span>
                    <h3 className="text-2xl font-black text-slate-900 mt-0.5">{students.length}</h3>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">check_circle</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Ödeyenler</span>
                    <h3 className="text-2xl font-black text-slate-900 mt-0.5">{students.filter(s => s.paymentStatus === 'PAID').length}</h3>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">pending</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Kısmi Ödeyenler</span>
                    <h3 className="text-2xl font-black text-slate-900 mt-0.5">{students.filter(s => s.paymentStatus === 'PARTIAL').length}</h3>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">error</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Ödeme Bekleyenler</span>
                    <h3 className="text-2xl font-black text-slate-900 mt-0.5">{students.filter(s => s.paymentStatus === 'UNPAID' || !s.paymentStatus).length}</h3>
                  </div>
                </div>
              </div>

              {/* Main List */}
              <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Öğrenci Ödeme Listesi</h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">Öğrencilerin aylık ücret, ödeme günü ve güncel ödeme durumu takibi</p>
                  </div>
                  
                  {/* Search Bar */}
                  <div className="relative w-full md:w-80">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                    <input 
                      type="text" 
                      placeholder="Öğrenci adı veya kod ile ara..." 
                      className="w-full pl-11 pr-5 py-3 rounded-2xl border border-slate-100 bg-slate-50/50 text-slate-800 placeholder-slate-400 font-bold text-sm outline-none focus:border-primary/20 focus:ring-2 focus:ring-primary/10 transition-all"
                      value={paymentSearch}
                      onChange={(e) => setPaymentSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="py-4 text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Öğrenci</th>
                        <th className="py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Sınıf/Seviye</th>
                        <th className="py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Ücret Tipi & Tutar</th>
                        <th className="py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Detay (Gün/Ders)</th>
                        <th className="py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Durum</th>
                        <th className="py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Açıklama / Not</th>
                        <th className="py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right pr-2">Eylemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {students
                        .filter(s => {
                          const query = paymentSearch.toLowerCase().trim();
                          if (!query) return true;
                          return (s.name || '').toLowerCase().includes(query) || (s.studentCode || '').toLowerCase().includes(query);
                        })
                        .map(student => (
                          <tr key={student.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="py-4 pl-2">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm">{student.name.charAt(0)}</div>
                                <div>
                                  <div className="font-bold text-slate-900 text-sm">{student.name}</div>
                                  <code className="text-[10px] text-slate-400 font-bold">{student.studentCode}</code>
                                </div>
                              </div>
                            </td>
                            <td className="py-4">
                              <span className="font-bold text-slate-600 text-sm">
                                {(student.grade === 'KPSS' || student.grade === 'Mezun') ? student.grade : `${student.grade}. Sınıf`}
                              </span>
                            </td>
                            <td className="py-4 font-bold text-slate-700 text-sm">
                              {student.paymentAmount ? `${student.paymentAmount} ₺` : '-'} 
                              <span className="text-[10px] font-black text-slate-450 ml-1 block">
                                ({student.paymentType === 'LESSON' ? 'Paket Ders' : 'Aylık'})
                              </span>
                            </td>
                            <td className="py-4 font-bold text-slate-700 text-sm">
                              {student.paymentType === 'LESSON' 
                                ? `${student.totalLessons || 0} Ders` 
                                : (student.paymentDay || '-')}
                            </td>
                            <td className="py-4">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                                student.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-600' :
                                student.paymentStatus === 'PARTIAL' ? 'bg-amber-50 text-amber-600' :
                                'bg-rose-50 text-rose-600'
                              }`}>
                                <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                                {student.paymentStatus === 'PAID' ? 'Ödendi' :
                                 student.paymentStatus === 'PARTIAL' ? 'Kısmi Ödendi' :
                                 'Ödenmedi'}
                              </span>
                            </td>
                            <td className="py-4 text-xs text-slate-500 font-medium max-w-xs truncate" title={student.paymentNote}>
                              {student.paymentNote || '-'}
                            </td>
                            <td className="py-4 text-right pr-2">
                              <button
                                onClick={() => handlePaymentEditClick(student)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 border border-primary/10 text-primary hover:bg-primary/5 rounded-xl text-xs font-black transition-all"
                              >
                                <span className="material-symbols-outlined text-sm">edit</span>
                                Düzenle
                              </button>
                            </td>
                          </tr>
                        ))
                      }
                      {students.filter(s => {
                        const query = paymentSearch.toLowerCase().trim();
                        if (!query) return true;
                        return (s.name || '').toLowerCase().includes(query) || (s.studentCode || '').toLowerCase().includes(query);
                      }).length === 0 && (
                        <tr>
                          <td colSpan="7" className="text-center py-8 text-slate-400 font-bold text-sm">Öğrenci bulunamadı.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'teachers' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Header and Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 font-display">Öğretmen Yönetimi</h3>
                  <p className="text-slate-500 font-bold text-sm mt-1">Sistemdeki öğretmenleri görün, yenilerini ekleyin ve öğrencileri atayın.</p>
                </div>
                <button
                  onClick={() => setShowAddTeacherModal(true)}
                  className="bg-primary hover:bg-primary/95 text-white font-black text-sm px-6 py-3 rounded-2xl shadow-lg shadow-primary/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined">add</span>
                  Öğretmen Ekle
                </button>
              </div>

              {/* Teachers List Grid */}
              <div className="grid grid-cols-1 gap-6">
                {teachers.map((teacher) => {
                  const teacherStudents = students.filter(s => s.teacherId === teacher.id);
                  const teacherLessons = lessons.filter(l => l.teacherId === teacher.id);

                  return (
                    <div key={teacher.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg uppercase">
                            {teacher.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 text-lg flex items-center gap-2">
                              {teacher.name}
                              {teacher.role === 'HEAD_TEACHER' && (
                                <span className="text-[10px] font-black text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Baş Öğretmen
                                </span>
                              )}
                            </h4>
                            <p className="text-slate-400 text-xs font-medium">{teacher.email} {teacher.studentTel && `• ${teacher.studentTel}`}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                            <div>
                              <span className="text-slate-400">Atanan Öğrenci:</span> <span className="text-slate-800 font-extrabold">{teacherStudents.length}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Toplam Canlı Ders:</span> <span className="text-slate-800 font-extrabold">{teacherLessons.length}</span>
                            </div>
                          </div>
                          {teacher.role !== 'HEAD_TEACHER' && (
                            <div className="flex items-center gap-2 border-l border-slate-100 pl-4">
                              <button
                                onClick={() => handleEditTeacherClick(teacher)}
                                className="text-slate-400 hover:text-primary transition-colors cursor-pointer flex items-center justify-center p-1.5 hover:bg-slate-50 rounded-lg"
                                title="Bilgileri Düzenle"
                              >
                                <span className="material-symbols-outlined text-lg">edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                                className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer flex items-center justify-center p-1.5 hover:bg-slate-50 rounded-lg"
                                title="Öğretmeni Sil"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Assigned Students */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-xs font-black text-slate-400 uppercase tracking-wider">Atanmış Öğrenciler</h5>
                        </div>
                        {teacherStudents.length === 0 ? (
                          <p className="text-slate-400 text-xs font-bold italic">Bu öğretmene henüz bir öğrenci atanmamış.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {teacherStudents.map(student => (
                              <div key={student.id} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
                                <span className="text-xs font-bold text-slate-700">{student.name}</span>
                                <button
                                  onClick={() => {
                                    if(window.confirm(`${student.name} isimli öğrencinin bu öğretmenle olan atamasını kaldırmak istiyor musunuz?`)) {
                                      handleAssignTeacher(student.id, null);
                                    }
                                  }}
                                  className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
                                  title="Atamayı Kaldır"
                                >
                                  <span className="material-symbols-outlined text-[14px]">close</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Planned Lessons */}
                      <div>
                        <h5 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Planlanan Canlı Dersler</h5>
                        {teacherLessons.length === 0 ? (
                          <p className="text-slate-400 text-xs font-bold italic">Planlanmış bir ders bulunmuyor.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {teacherLessons.slice(0, 6).map(lesson => (
                              <div key={lesson.id} className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 flex flex-col justify-between gap-2">
                                <div>
                                  <h6 className="font-bold text-slate-800 text-xs truncate" title={lesson.title}>{lesson.title}</h6>
                                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                    Öğrenci: <span className="text-slate-650">{lesson.student?.name || 'Genel'}</span>
                                  </p>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium text-right">
                                  {new Date(lesson.date).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            ))}
                            {teacherLessons.length > 6 && (
                              <div className="p-3 bg-slate-50/30 rounded-xl border border-slate-100 border-dashed flex items-center justify-center text-slate-400 text-xs font-bold">
                                +{teacherLessons.length - 6} ders daha
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Student Assignments Table */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mt-8">
                <h4 className="font-black text-slate-900 text-lg mb-2">Öğrenci - Öğretmen Atama Paneli</h4>
                <p className="text-slate-400 font-bold text-sm mb-6">Öğrencilerin atanacağı öğretmenleri seçebilirsiniz.</p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-black text-xs uppercase tracking-wider">
                        <th className="py-4">Öğrenci Adı</th>
                        <th className="py-4">Sınıfı</th>
                        <th className="py-4">Mevcut Öğretmen</th>
                        <th className="py-4 text-right pr-2">Öğretmen Ataması Yap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="py-4 font-bold text-slate-900 text-sm">{student.name}</td>
                          <td className="py-4 font-bold text-slate-500 text-sm">
                            {(student.grade === 'KPSS' || student.grade === 'Mezun') ? student.grade : `${student.grade}. Sınıf`}
                          </td>
                          <td className="py-4">
                            {student.teacher ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                                {student.teacher.name}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-400 italic">
                                Atanmamış
                              </span>
                            )}
                          </td>
                          <td className="py-4 text-right pr-2">
                            <select
                              value={student.teacherId || ''}
                              onChange={(e) => handleAssignTeacher(student.id, e.target.value || null)}
                              className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-primary focus:bg-white transition-all"
                            >
                              <option value="">Seçiniz (Atamayı Kaldır)</option>
                              {teachers.filter(t => t.role === 'TEACHER').map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10 relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowAddModal(false)} className="absolute right-8 top-8 text-slate-300 hover:text-slate-900 transition-colors">
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>
            <h3 className="text-3xl font-black text-slate-900 mb-2">Yeni Öğrenci Kaydı</h3>
            <p className="text-slate-400 font-bold text-sm mb-10 uppercase tracking-widest">Eksiksiz doldurunuz</p>
            
            <form onSubmit={handleAddStudent} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">Ad Soyad</label>
                  <input className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20" value={newStudent.name} onChange={(e) => setNewStudent({...newStudent, name: e.target.value})} required/>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">Sınıf</label>
                  <select className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20" value={newStudent.grade} onChange={(e) => setNewStudent({...newStudent, grade: e.target.value})} required>
                    <option value="">Seçiniz</option>
                    {[5,6,7,8,9,10,11,12].map(g => <option key={g} value={g}>{g}. Sınıf</option>)}
                    <option value="Mezun">Mezun</option>
                    <option value="KPSS">KPSS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">E-posta (Opsiyonel)</label>
                  <input type="email" className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none" value={newStudent.email} onChange={(e) => setNewStudent({...newStudent, email: e.target.value})}/>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">Öğrenci Tel (Opsiyonel)</label>
                  <input type="tel" className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none" value={newStudent.studentTel || ''} onChange={(e) => setNewStudent({...newStudent, studentTel: e.target.value})}/>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">Veli Adı</label>
                  <input className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none" value={newStudent.parentName} onChange={(e) => setNewStudent({...newStudent, parentName: e.target.value})}/>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">Veli Tel</label>
                  <input className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none" value={newStudent.parentTel} onChange={(e) => setNewStudent({...newStudent, parentTel: e.target.value})}/>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-100">
                <label className="text-xs font-black text-slate-400 uppercase ml-1">Verilen Hizmet (Opsiyonel)</label>
                <input className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20" placeholder="Örn: Haftalık 2 Ders Matematik Özel Ders, LGS Hazırlık Paketi vb." value={newStudent.serviceProvided || ''} onChange={(e) => setNewStudent({...newStudent, serviceProvided: e.target.value})}/>
              </div>

              <button type="submit" className="w-full py-5 bg-primary text-white font-black rounded-3xl shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all text-lg mt-4">Kaydı Tamamla</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Teacher Modal */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-10 relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowAddTeacherModal(false)} className="absolute right-8 top-8 text-slate-300 hover:text-slate-900 transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>
            <h3 className="text-3xl font-black text-slate-900 mb-2 font-display">Yeni Öğretmen Ekle</h3>
            <p className="text-slate-400 font-bold text-sm mb-8 uppercase tracking-widest">Sisteme öğretmen tanımlayın</p>
            
            <form onSubmit={handleAddTeacher} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase ml-1">Ad Soyad</label>
                <input 
                  type="text"
                  className="w-full rounded-2xl border border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20" 
                  value={newTeacher.name} 
                  onChange={(e) => setNewTeacher({...newTeacher, name: e.target.value})} 
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase ml-1">E-posta Adresi</label>
                <input 
                  type="email" 
                  className="w-full rounded-2xl border border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20" 
                  value={newTeacher.email} 
                  onChange={(e) => setNewTeacher({...newTeacher, email: e.target.value})} 
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase ml-1">Telefon Numarası</label>
                <input 
                  type="tel"
                  placeholder="Örn: 05551112233"
                  className="w-full rounded-2xl border border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20" 
                  value={newTeacher.studentTel || ''} 
                  onChange={(e) => setNewTeacher({...newTeacher, studentTel: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-black text-slate-400 uppercase">Giriş Şifresi</label>
                  <button 
                    type="button" 
                    onClick={() => setNewTeacher({...newTeacher, password: generatePassword()})} 
                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    Şifre Öner
                  </button>
                </div>
                <input 
                  type="text" 
                  className="w-full rounded-2xl border border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20" 
                  value={newTeacher.password} 
                  onChange={(e) => setNewTeacher({...newTeacher, password: e.target.value})} 
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary/95 text-white font-black text-sm py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all mt-4 cursor-pointer"
              >
                Öğretmeni Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Teacher Modal */}
      {showEditTeacherModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-10 relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowEditTeacherModal(false)} className="absolute right-8 top-8 text-slate-300 hover:text-slate-900 transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>
            <h3 className="text-3xl font-black text-slate-900 mb-2 font-display">Öğretmen Düzenle</h3>
            <p className="text-slate-400 font-bold text-sm mb-8 uppercase tracking-widest">Öğretmen bilgilerini güncelleyin</p>
            
            <form onSubmit={handleEditTeacherSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase ml-1">Ad Soyad</label>
                <input 
                  type="text"
                  className="w-full rounded-2xl border border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20" 
                  value={editingTeacher.name} 
                  onChange={(e) => setEditingTeacher({...editingTeacher, name: e.target.value})} 
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase ml-1">E-posta Adresi</label>
                <input 
                  type="email" 
                  className="w-full rounded-2xl border border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20" 
                  value={editingTeacher.email} 
                  onChange={(e) => setEditingTeacher({...editingTeacher, email: e.target.value})} 
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase ml-1">Telefon Numarası</label>
                <input 
                  type="tel"
                  placeholder="Örn: 05551112233"
                  className="w-full rounded-2xl border border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20" 
                  value={editingTeacher.studentTel || ''} 
                  onChange={(e) => setEditingTeacher({...editingTeacher, studentTel: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-black text-slate-400 uppercase">Yeni Giriş Şifresi (Opsiyonel)</label>
                  <button 
                    type="button" 
                    onClick={() => setEditingTeacher({...editingTeacher, password: generatePassword()})} 
                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    Şifre Öner
                  </button>
                </div>
                <input 
                  type="text" 
                  placeholder="Değiştirmek istemiyorsanız boş bırakın"
                  className="w-full rounded-2xl border border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20" 
                  value={editingTeacher.password || ''} 
                  onChange={(e) => setEditingTeacher({...editingTeacher, password: e.target.value})} 
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary/95 text-white font-black text-sm py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all mt-4 cursor-pointer"
              >
                Değişiklikleri Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10 relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowEditModal(false)} className="absolute right-8 top-8 text-slate-300 hover:text-slate-900 transition-colors">
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>
            <h3 className="text-3xl font-black text-slate-900 mb-2">Öğrenci Bilgilerini Düzenle</h3>
            <p className="text-slate-400 font-bold text-sm mb-10 uppercase tracking-widest">Bilgileri güncelleyebilirsiniz</p>
            
            <form onSubmit={handleEditStudentSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">Ad Soyad</label>
                  <input
                    className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                    value={editingStudent.name}
                    onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">Sınıf</label>
                  <select
                    className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                    value={editingStudent.grade}
                    onChange={(e) => setEditingStudent({...editingStudent, grade: e.target.value})}
                    required
                  >
                    <option value="">Seçiniz</option>
                    {[5,6,7,8,9,10,11,12].map(g => <option key={g} value={g}>{g}. Sınıf</option>)}
                    <option value="Mezun">Mezun</option>
                    <option value="KPSS">KPSS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">E-posta</label>
                  <input
                    type="email"
                    className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                    value={editingStudent.email}
                    onChange={(e) => setEditingStudent({...editingStudent, email: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">Öğrenci Tel (Opsiyonel)</label>
                  <input
                    type="tel"
                    className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                    value={editingStudent.studentTel}
                    onChange={(e) => setEditingStudent({...editingStudent, studentTel: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">Veli Adı</label>
                  <input
                    className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                    value={editingStudent.parentName}
                    onChange={(e) => setEditingStudent({...editingStudent, parentName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">Veli Tel</label>
                  <input
                    className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                    value={editingStudent.parentTel}
                    onChange={(e) => setEditingStudent({...editingStudent, parentTel: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-100">
                <label className="text-xs font-black text-slate-400 uppercase ml-1">Verilen Hizmet (Opsiyonel)</label>
                <input
                  className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Örn: Haftalık 2 Ders Matematik Özel Ders, LGS Hazırlık Paketi vb."
                  value={editingStudent.serviceProvided || ''}
                  onChange={(e) => setEditingStudent({...editingStudent, serviceProvided: e.target.value})}
                />
              </div>

              <button type="submit" className="w-full py-5 bg-primary text-white font-black rounded-3xl shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all text-lg mt-4">Değişiklikleri Kaydet</button>
            </form>
          </div>
        </div>
      )}

      {/* Payment Edit Modal */}
      {showPaymentEditModal && paymentEditingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl p-10 relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowPaymentEditModal(false)} className="absolute right-8 top-8 text-slate-300 hover:text-slate-900 transition-colors">
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Ödeme Bilgilerini Güncelle</h3>
            <p className="text-slate-400 font-bold text-sm mb-8 uppercase tracking-widest">{paymentEditingStudent.name} ({paymentEditingStudent.studentCode})</p>
            
            <form onSubmit={handlePaymentEditSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase ml-1">Ödeme Tipi</label>
                <select
                  className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                  value={paymentEditingStudent.paymentType || 'MONTHLY'}
                  onChange={(e) => setPaymentEditingStudent({
                    ...paymentEditingStudent, 
                    paymentType: e.target.value,
                    totalLessons: e.target.value === 'MONTHLY' ? 0 : paymentEditingStudent.totalLessons || 8
                  })}
                  required
                >
                  <option value="MONTHLY">Aylık Düz Ücret</option>
                  <option value="LESSON">Derslik Paket</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">
                    {paymentEditingStudent.paymentType === 'LESSON' ? 'Paket Ücreti' : 'Aylık Ücret'}
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder={paymentEditingStudent.paymentType === 'LESSON' ? "Örn: 8000 TL" : "Örn: 5000 TL"}
                    value={paymentEditingStudent.paymentAmount}
                    onChange={(e) => setPaymentEditingStudent({...paymentEditingStudent, paymentAmount: e.target.value})}
                  />
                </div>
                {paymentEditingStudent.paymentType === 'LESSON' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Ders Sayısı</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Örn: 8"
                      value={paymentEditingStudent.totalLessons || ''}
                      onChange={(e) => setPaymentEditingStudent({...paymentEditingStudent, totalLessons: parseInt(e.target.value) || 0})}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Ödeme Günü</label>
                    <input
                      type="text"
                      className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Örn: Her ayın 15'i"
                      value={paymentEditingStudent.paymentDay}
                      onChange={(e) => setPaymentEditingStudent({...paymentEditingStudent, paymentDay: e.target.value})}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase ml-1">Bu Ayki Ödeme Durumu</label>
                <select
                  className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                  value={paymentEditingStudent.paymentStatus}
                  onChange={(e) => setPaymentEditingStudent({...paymentEditingStudent, paymentStatus: e.target.value})}
                  required
                >
                  <option value="UNPAID">Ödenmedi</option>
                  <option value="PARTIAL">Kısmi Ödendi</option>
                  <option value="PAID">Ödendi</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase ml-1">Açıklama / Not</label>
                <textarea
                  className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20 h-24 resize-none"
                  placeholder="Ödeme detayları, gecikme durumları vb. notlar..."
                  value={paymentEditingStudent.paymentNote || ''}
                  onChange={(e) => setPaymentEditingStudent({...paymentEditingStudent, paymentNote: e.target.value})}
                />
              </div>

              <button type="submit" className="w-full py-5 bg-primary text-white font-black rounded-3xl shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all text-lg mt-4">Bilgileri Güncelle</button>
            </form>
          </div>
        </div>
      )}

      {/* Live Class Overlay / Modal */}
      {activeMeeting && (
        activeMeeting.zoomJoinUrl && activeMeeting.zoomJoinUrl.includes('zoom.us') ? (
          (() => {
            const { meetingNumber, password } = parseZoomUrl(activeMeeting.zoomJoinUrl);
            return (
              <ZoomMeeting
                meetingNumber={meetingNumber}
                meetingPassword={password}
                role="TEACHER"
                userName={user?.name || 'Öğretmen'}
                userEmail={user?.email || 'info@fullematematigi.com.tr'}
                onClose={() => setActiveMeeting(null)}
              />
            );
          })()
        ) : (
          <LiveMeeting
            lessonId={activeMeeting.id}
            role="TEACHER"
            userName={user?.name || 'Öğretmen'}
            userId={user?.id || user?.studentCode || user?.email}
            onClose={() => setActiveMeeting(null)}
          />
        )
      )}
    </div>
  );
};

export default TeacherDashboard;

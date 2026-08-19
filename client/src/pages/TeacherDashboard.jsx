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

const compressImage = handleImageUpload;

const TeacherDashboard = () => {
  const [students, setStudents] = useState([]);
  const [newStudent, setNewStudent] = useState({ email: '', password: '', name: '', grade: '', parentName: '', parentTel: '', studentTel: '', serviceProvided: '' });
  const [newLesson, setNewLesson] = useState({ title: '', description: '', date: '' });
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentTrials, setStudentTrials] = useState([]);
  const [expandedTrialId, setExpandedTrialId] = useState(null);
  const [studentHataDefteri, setStudentHataDefteri] = useState([]);
  const [teacherHataLightbox, setTeacherHataLightbox] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState(null);
  const { user, logout } = useAuth();

  // Calendar states
  const [lessons, setLessons] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [lessonTime, setLessonTime] = useState('12:00');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [newLessonZoomUrl, setNewLessonZoomUrl] = useState('');

  // Recurring (haftalık tekrar eden) ders serisi states
  const [recurringTitle, setRecurringTitle] = useState('');
  const [recurringDayOfWeek, setRecurringDayOfWeek] = useState(1);
  const [recurringTime, setRecurringTime] = useState('18:00');
  const [recurringWeeks, setRecurringWeeks] = useState(8);
  const [recurringStudentIds, setRecurringStudentIds] = useState([]);
  const [recurringStudentSearch, setRecurringStudentSearch] = useState('');
  const [recurringZoomUrl, setRecurringZoomUrl] = useState('');
  const [creatingRecurring, setCreatingRecurring] = useState(false);
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

  // Classroom (Sınıflar) states
  const [classrooms, setClassrooms] = useState([]);
  const [studentSubTab, setStudentSubTab] = useState('students'); // 'students' | 'classes'
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState(null);
  const [classNameInput, setClassNameInput] = useState('');
  const [classStudentIdsInput, setClassStudentIdsInput] = useState([]);
  const [classStudentSearch, setClassStudentSearch] = useState('');
  const [recurringStartDate, setRecurringStartDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Homework & Question Assignment states
  const [studentHomeworks, setStudentHomeworks] = useState([]);
  const [assignType, setAssignType] = useState('HOMEWORK'); // 'HOMEWORK' | 'QUESTION'
  const [assignText, setAssignText] = useState('');

  // Access Code Generation states (Baş Öğretmen Yetkisi)
  const [accessCodes, setAccessCodes] = useState(() => {
    try {
      const saved = localStorage.getItem('fulle_access_codes');
      return saved ? JSON.parse(saved) : [
        {
          id: 'code-1',
          code: 'SHOP-8A92K',
          personName: 'Ahmet Yılmaz',
          packageName: 'Shopier LGS Matematik Kayıtları',
          driveUrl: 'https://drive.google.com/drive/u/0/folders/1PwOkf-1M80Ar-ct9TiiwRMdPW5G9d73-',
          createdAt: new Date().toLocaleDateString('tr-TR')
        }
      ];
    } catch {
      return [];
    }
  });

  const [newCodePersonName, setNewCodePersonName] = useState('');
  const [newCodePackageName, setNewCodePackageName] = useState('Shopier Özel Ders Kayıt Paketi');
  const [newCodeDriveUrl, setNewCodeDriveUrl] = useState('https://drive.google.com/drive/u/0/folders/1PwOkf-1M80Ar-ct9TiiwRMdPW5G9d73-');
  const [copiedCodeId, setCopiedCodeId] = useState(null);

  const fetchAccessCodes = async () => {
    try {
      const res = await axios.get('/api/access-codes');
      if (res.data && Array.isArray(res.data)) {
        setAccessCodes(res.data);
        localStorage.setItem('fulle_access_codes', JSON.stringify(res.data));
      }
    } catch (err) {
      console.error('Error fetching access codes:', err);
      const saved = localStorage.getItem('fulle_access_codes');
      if (saved) setAccessCodes(JSON.parse(saved));
    }
  };

  const handleCreateAccessCode = async (e) => {
    e?.preventDefault();
    if (!newCodePersonName.trim()) return;

    const randStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    const generatedCode = `SHOP-${randStr}`;

    const payload = {
      code: generatedCode,
      personName: newCodePersonName.trim(),
      packageName: newCodePackageName.trim() || 'Ders Kayıt Paketi',
      driveUrl: newCodeDriveUrl.trim() || 'https://drive.google.com/drive/u/0/folders/1PwOkf-1M80Ar-ct9TiiwRMdPW5G9d73-'
    };

    try {
      const res = await axios.post('/api/access-codes', payload);
      const created = res.data;
      const updated = [created, ...accessCodes];
      setAccessCodes(updated);
      localStorage.setItem('fulle_access_codes', JSON.stringify(updated));
    } catch (err) {
      console.error('Error creating access code on server:', err);
      const newEntry = {
        id: Date.now().toString(),
        code: generatedCode,
        personName: payload.personName,
        packageName: payload.packageName,
        driveUrl: payload.driveUrl,
        createdAt: new Date().toLocaleDateString('tr-TR')
      };
      const updated = [newEntry, ...accessCodes];
      setAccessCodes(updated);
      localStorage.setItem('fulle_access_codes', JSON.stringify(updated));
    }
    setNewCodePersonName('');
  };

  const handleDeleteAccessCode = async (id) => {
    try {
      await axios.delete(`/api/access-codes/${id}`);
    } catch (err) {
      console.error('Error deleting access code from server:', err);
    }
    const updated = accessCodes.filter(c => c.id !== id && c.id !== parseInt(id));
    setAccessCodes(updated);
    localStorage.setItem('fulle_access_codes', JSON.stringify(updated));
  };

  const handleCopyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };


  // PDF Notes States
  const [pdfNotesList, setPdfNotesList] = useState([]);
  const [showAddPdfModal, setShowAddPdfModal] = useState(false);
  const [newPdfTitle, setNewPdfTitle] = useState('');
  const [newPdfDescription, setNewPdfDescription] = useState('');
  const [newPdfCategory, setNewPdfCategory] = useState('LGS');
  const [newPdfBase64, setNewPdfBase64] = useState('');
  const [newPdfFileName, setNewPdfFileName] = useState('');
  const [pdfPublishing, setPdfPublishing] = useState(false);
  const [assignImage, setAssignImage] = useState('');
  const [assignDeadline, setAssignDeadline] = useState('');
  const [assignSending, setAssignSending] = useState(false);
  const [assignLightbox, setAssignLightbox] = useState(null);
  const [messagedStudentIds, setMessagedStudentIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('messagedStudentIds') || '[]');
    } catch (e) {
      return [];
    }
  });

  // Quota Management States
  const [quotaCoursesList, setQuotaCoursesList] = useState([]);
  const [quotaAppsList, setQuotaAppsList] = useState([]);
  const [quotaCatFilter, setQuotaCatFilter] = useState('YKS 2027');
  const [showQuotaCourseModal, setShowQuotaCourseModal] = useState(false);
  const [editingQuotaId, setEditingQuotaId] = useState(null);
  const [quotaFormState, setQuotaFormState] = useState({
    category: 'YKS 2027',
    title: '',
    description: '',
    published: true,
    tracks: ['Sayısal', 'Eşit Ağırlık', 'Sözel', 'Yabancı Dil'],
    totalQuota: 20,
    remainingQuota: 5,
    price: '3.500 TL',
    image: '/IMG_2943.jpeg',
    whatsappLink: ''
  });

  const fetchQuotaCourses = async () => {
    try {
      const res = await axios.get('/api/teacher/quota-courses');
      setQuotaCoursesList(res.data || []);
    } catch (err) {
      console.error('Error fetching quota courses:', err);
    }
  };

  const fetchQuotaApplications = async () => {
    try {
      const res = await axios.get('/api/teacher/quota-applications');
      setQuotaAppsList(res.data || []);
    } catch (err) {
      console.error('Error fetching quota applications:', err);
    }
  };

  const handleSaveQuotaCourse = async (e) => {
    e.preventDefault();
    try {
      if (editingQuotaId) {
        await axios.put(`/api/teacher/quota-courses/${editingQuotaId}`, quotaFormState);
      } else {
        await axios.post('/api/teacher/quota-courses', quotaFormState);
      }
      setShowQuotaCourseModal(false);
      setEditingQuotaId(null);
      setQuotaFormState({
        category: quotaCatFilter,
        title: '',
        description: '',
        published: true,
        tracks: ['Sayısal', 'Eşit Ağırlık', 'Sözel', 'Yabancı Dil'],
        totalQuota: 20,
        remainingQuota: 5,
        price: '3.500 TL',
        image: '/IMG_2943.jpeg',
        whatsappLink: ''
      });
      fetchQuotaCourses();
    } catch (err) {
      alert('Hata: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteQuotaCourse = async (id) => {
    if (!window.confirm('Bu dersi silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`/api/teacher/quota-courses/${id}`);
      fetchQuotaCourses();
    } catch (err) {
      alert('Hata: ' + err.message);
    }
  };

  const handleToggleQuotaPublished = async (course) => {
    try {
      await axios.put(`/api/teacher/quota-courses/${course.id}`, {
        ...course,
        published: !course.published
      });
      fetchQuotaCourses();
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const handleDeleteQuotaApplication = async (id) => {
    if (!window.confirm('Bu başvuruyu silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`/api/teacher/quota-applications/${id}`);
      fetchQuotaApplications();
    } catch (err) {
      alert('Hata: ' + err.message);
    }
  };

  const getInitialCampCategories = (camp) => {
    if (!camp) return [];
    let categories = [];
    if (camp.category) {
      if (Array.isArray(camp.category)) {
        categories = [...camp.category];
      } else if (typeof camp.category === 'string') {
        try {
          const parsed = JSON.parse(camp.category);
          if (Array.isArray(parsed)) categories = parsed;
          else categories = camp.category.split(',').map(s => s.trim()).filter(Boolean);
        } catch (e) {
          categories = camp.category.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    } else {
      if (camp.badge?.includes('LGS') || camp.title?.includes('LGS') || camp.title?.includes('Ortaokul')) categories.push('LGS 2027');
      if (camp.badge?.includes('KPSS') || camp.title?.includes('KPSS')) categories.push('KPSS 2027');
      if (camp.badge?.includes('YKS') || camp.title?.includes('YKS') || camp.title?.includes('Lisans')) categories.push('YKS 2027');
      if (camp.badge?.includes('Maarif') || camp.title?.includes('Maarif')) categories.push('MAARIF');
    }
    return Array.from(new Set(categories));
  };

  const isCampCategoryActive = (camp, cat) => {
    if (!camp) return false;
    const categories = getInitialCampCategories(camp);
    return categories.includes(cat);
  };

  const handleToggleCampCategory = async (camp, catToToggle) => {
    if (!camp) return;
    let categories = getInitialCampCategories(camp);

    if (categories.includes(catToToggle)) {
      categories = categories.filter(c => c !== catToToggle);
    } else {
      categories.push(catToToggle);
    }

    const newCatString = JSON.stringify(categories);

    // Instant optimistic state update
    setCampsList(prev => prev.map(c => c.id === camp.id ? { ...c, category: newCatString } : c));

    try {
      await axios.put(`/api/teacher/camps/${camp.id}`, {
        ...camp,
        category: newCatString
      });
    } catch (err) {
      console.error('Error toggling camp category:', err);
      fetchCamps();
    }
  };

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
    price: '',
    whatsappLink: '',
    tarih: '',
    dersProgrami: '',
    toplamDers: '',
    egitimTuru: 'Online Canlı Eğitim (Zoom)'
  });
  const [campView, setCampView] = useState('list');
  const [deleteConfirmCampId, setDeleteConfirmCampId] = useState(null);
  const [editingCampId, setEditingCampId] = useState(null);

  const trMonths = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  const trDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const recurringDayOptions = [
    { value: 1, label: 'Pazartesi' },
    { value: 2, label: 'Salı' },
    { value: 3, label: 'Çarşamba' },
    { value: 4, label: 'Perşembe' },
    { value: 5, label: 'Cuma' },
    { value: 6, label: 'Cumartesi' },
    { value: 0, label: 'Pazar' },
  ];

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

  const handleFirstMessage = (e, student) => {
    e.stopPropagation();
    const phone = student.studentTel || student.parentTel;
    if (!phone) return;
    const message = `Merhaba! Yeni sistemimizi hayata geçirdik.\n\nÖğrenci giriş kodu: ${student.studentCode}\nVeli giriş kodu: ${student.parentCode || '-'}\n\nGiriş adresi: https://fullematematigi.com.tr/giris`;
    const newMessaged = [...messagedStudentIds, student.id];
    setMessagedStudentIds(newMessaged);
    localStorage.setItem('fulle_messaged_students', JSON.stringify(newMessaged));
    window.open(getWhatsAppLink(phone, message), '_blank');
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

  const getLessonStudentNames = (lesson) => {
    if (!lesson) return 'Genel';
    let ids = [];
    if (lesson.studentIds) {
      try { ids = JSON.parse(lesson.studentIds); } catch {}
    } else if (lesson.studentId) {
      ids = [lesson.studentId];
    }
    if (ids.length === 0) return lesson.student?.name || 'Tüm Sınıf';
    const names = ids
      .map(id => students.find(s => s.id === id)?.name)
      .filter(Boolean);
    return names.length > 0 ? names.join(', ') : (lesson.student?.name || 'Tüm Sınıf');
  };

  useEffect(() => {
    fetchStudents();
    fetchLessons();
    fetchClassrooms();
    fetchTrialRequests();
    fetchContactMessages();
    fetchCamps();
    fetchAccessCodes();
    if (user?.role === 'HEAD_TEACHER') {
      fetchTeachers();
    }
  }, [user]);


  const fetchClassrooms = async () => {
    try {
      const res = await axios.get('/api/teacher/classrooms');
      setClassrooms(res.data);
    } catch (err) {
      console.error('Error fetching classrooms:', err);
    }
  };

  const handleSaveClassroom = async (e) => {
    e.preventDefault();
    if (!classNameInput.trim()) {
      alert('Lütfen sınıf adını girin.');
      return;
    }
    try {
      if (editingClassroom) {
        await axios.put(`/api/teacher/classrooms/${editingClassroom.id}`, {
          name: classNameInput.trim(),
          studentIds: classStudentIdsInput
        });
        alert('Sınıf başarıyla güncellendi!');
      } else {
        await axios.post('/api/teacher/classrooms', {
          name: classNameInput.trim(),
          studentIds: classStudentIdsInput
        });
        alert('Yeni sınıf başarıyla oluşturuldu!');
      }
      setShowClassModal(false);
      setEditingClassroom(null);
      setClassNameInput('');
      setClassStudentIdsInput([]);
      fetchClassrooms();
    } catch (err) {
      alert('Sınıf kaydedilirken hata oluştu: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteClassroom = async (classroomId, className) => {
    if (!window.confirm(`"${className}" sınıfını silmek istediğinize emin misiniz?`)) return;
    try {
      await axios.delete(`/api/teacher/classrooms/${classroomId}`);
      fetchClassrooms();
    } catch (err) {
      alert('Sınıf silinirken hata oluştu.');
    }
  };

  const toggleClassroomStudents = (classroomStudentIds, currentSelectedIds, setSelectedFn) => {
    const allSelected = classroomStudentIds.length > 0 && classroomStudentIds.every(id => currentSelectedIds.includes(id));
    if (allSelected) {
      setSelectedFn(prev => prev.filter(id => !classroomStudentIds.includes(id)));
    } else {
      setSelectedFn(prev => Array.from(new Set([...prev, ...classroomStudentIds])));
    }
  };

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
      const [trialsRes, hataRes, hwRes] = await Promise.all([
        axios.get(`/api/teacher/student/${student.id}/trials`),
        axios.get(`/api/teacher/student/${student.id}/hata-defteri`),
        axios.get(`/api/teacher/student/${student.id}/homeworks`)
      ]);
      setStudentTrials(trialsRes.data);
      setStudentHataDefteri(hataRes.data);
      setStudentHomeworks(hwRes.data);
      setSelectedStudent(student);
      setExpandedTrialId(null);
      setActiveTab('student-detail');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendAssignmentToStudent = async (e) => {
    e.preventDefault();
    if (!assignText.trim() && !assignImage) {
      alert('Lütfen bir mesaj yazın veya fotoğraf ekleyin.');
      return;
    }
    setAssignSending(true);
    try {
      await axios.post('/api/teacher/assign-homework', {
        title: assignType === 'QUESTION' ? 'Öğretmen Sorusu' : 'Ödev',
        description: assignText.trim(),
        type: assignType,
        imageUrl: assignImage || null,
        studentIds: [selectedStudent.id],
        deadline: assignDeadline || null
      });
      alert(assignType === 'QUESTION' ? 'Soru öğrenciye başarıyla gönderildi!' : 'Ödev öğrenciye başarıyla gönderildi!');
      setAssignText('');
      setAssignImage('');
      setAssignDeadline('');
      const hwRes = await axios.get(`/api/teacher/student/${selectedStudent.id}/homeworks`);
      setStudentHomeworks(hwRes.data);
    } catch (err) {
      alert('Gönderilirken hata oluştu: ' + (err.response?.data?.error || err.message));
    } finally {
      setAssignSending(false);
    }
  };

  const handleDeleteAssignment = async (homeworkId) => {
    if (!window.confirm('Bu ödevi/soruyu silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`/api/teacher/homework/${homeworkId}`);
      setStudentHomeworks(prev => prev.filter(item => item.homeworkId !== homeworkId && item.homework?.id !== homeworkId));
    } catch (err) {
      alert('Silinirken hata oluştu.');
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

  const handleCreateRecurringLessons = async (e) => {
    e.preventDefault();
    if (recurringStudentIds.length === 0) {
      alert('Lütfen bu ders serisi için en az bir öğrenci seçin.');
      return;
    }
    setCreatingRecurring(true);
    try {
      const res = await axios.post('/api/teacher/create-recurring-lessons', {
        title: recurringTitle,
        dayOfWeek: recurringDayOfWeek,
        time: recurringTime,
        weeks: recurringWeeks,
        startDate: recurringStartDate,
        studentIds: recurringStudentIds,
        zoomJoinUrl: recurringZoomUrl
      });
      setRecurringTitle('');
      setRecurringStudentIds([]);
      setRecurringZoomUrl('');
      fetchLessons();
      alert(`${res.data.lessons.length} haftalık ders serisi başarıyla oluşturuldu!`);
    } catch (err) {
      alert('Ders serisi oluşturulurken hata oluştu: ' + (err.response?.data?.error || err.message));
    } finally {
      setCreatingRecurring(false);
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
    } else if (activeTab === 'pdf-notes') {
      fetchPdfNotes();
    } else if (activeTab === 'quota') {
      fetchCamps();
      fetchQuotaCourses();
      fetchQuotaApplications();
    }
  }, [activeTab]);

  const fetchPdfNotes = async () => {
    try {
      const res = await axios.get('/api/pdf-notes');
      setPdfNotesList(res.data);
    } catch (err) {
      console.error('Error fetching pdf notes:', err);
    }
  };

  const handlePublishPdfNote = async (e) => {
    e.preventDefault();
    if (!newPdfTitle || !newPdfBase64) {
      alert('Lütfen ders notu başlığı ve PDF dosyası seçiniz.');
      return;
    }
    try {
      setPdfPublishing(true);
      await axios.post('/api/teacher/pdf-notes', {
        title: newPdfTitle,
        description: newPdfDescription,
        category: newPdfCategory,
        pdfUrl: newPdfBase64,
        fileName: newPdfFileName || 'ders-notu.pdf'
      });
      alert('PDF ders notu başarıyla yayınlandı!');
      setNewPdfTitle('');
      setNewPdfDescription('');
      setNewPdfCategory('LGS');
      setNewPdfBase64('');
      setNewPdfFileName('');
      setShowAddPdfModal(false);
      fetchPdfNotes();
    } catch (err) {
      console.error('PDF publish error:', err);
      const errMsg = typeof err.response?.data?.error === 'string' 
        ? err.response.data.error 
        : (err.response?.data?.message || err.message || 'Bilinmeyen hata');
      alert('Not yayınlanırken hata oluştu: ' + errMsg);
    } finally {
      setPdfPublishing(false);
    }
  };

  const handleDeletePdfNote = async (id) => {
    if (!window.confirm('Bu PDF ders notunu silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`/api/teacher/pdf-notes/${id}`);
      fetchPdfNotes();
    } catch (err) {
      const errMsg = typeof err.response?.data?.error === 'string' 
        ? err.response.data.error 
        : (err.response?.data?.message || err.message || 'Bilinmeyen hata');
      alert('Not silinirken hata oluştu: ' + errMsg);
    }
  };

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
    const isEditing = !!editingCampId;
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
        price: newCamp.price,
        whatsappLink: waLink
      };

      if (isEditing) {
        await axios.put(`/api/teacher/camps/${editingCampId}`, payload);
      } else {
        await axios.post('/api/teacher/camps', payload);
      }
      setNewCamp({
        badge: '',
        title: '',
        subtitle: '',
        image: '',
        description: '',
        highlights: '',
        price: '',
        whatsappLink: '',
        tarih: '',
        dersProgrami: '',
        toplamDers: '',
        egitimTuru: 'Online Canlı Eğitim (Zoom)'
      });
      setEditingCampId(null);
      setCampView('list');
      fetchCamps();
      alert(isEditing ? 'Kamp başarıyla güncellendi!' : 'Eğitim kampı başarıyla yayınlandı!');
    } catch (err) {
      alert(isEditing ? 'Kamp güncellenirken hata oluştu.' : 'Eğitim kampı yayınlanırken hata oluştu.');
    }
  };

  const handleMigrateCatbox = async () => {
    setMigrating(true);
    setMigrateResult(null);
    try {
      const res = await axios.post('/api/teacher/migrate-catbox-recordings');
      setMigrateResult(res.data);
      if (res.data.migrated > 0) fetchLessons();
    } catch (err) {
      setMigrateResult({ error: err.response?.data?.error || 'Taşıma başarısız.' });
    } finally {
      setMigrating(false);
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

  const handleDeleteLesson = async (lesson) => {
    if (lesson.seriesId) {
      const deleteWholeSeries = window.confirm(
        'Bu ders, haftalık tekrar eden bir ders serisinin parçası.\n\nSeriye ait TÜM dersleri silmek için Tamam\'a, sadece bu dersi silmek için İptal\'e basın.'
      );
      if (deleteWholeSeries) {
        try {
          const res = await axios.delete(`/api/teacher/lesson-series/${lesson.seriesId}`);
          fetchLessons();
          alert(`${res.data.count} ders (tüm seri) başarıyla silindi!`);
        } catch (err) {
          alert('Ders serisi silinirken hata oluştu.');
        }
        return;
      }
    }

    if (!window.confirm('Bu dersi silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`/api/teacher/lessons/${lesson.id}`);
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

  const handleEditCampClick = (camp) => {
    let highlightsText = '';
    try {
      const arr = JSON.parse(camp.highlights || '[]');
      highlightsText = Array.isArray(arr) ? arr.join('\n') : '';
    } catch {
      highlightsText = camp.highlights || '';
    }

    let tarih = '', dersProgrami = '', toplamDers = '', egitimTuru = 'Online Canlı Eğitim (Zoom)';
    try {
      const details = JSON.parse(camp.details || '[]');
      details.forEach(d => {
        const value = d.value === 'Belirtilmedi' ? '' : d.value;
        if (d.label === 'Tarih') tarih = value;
        if (d.label === 'Ders Programı') dersProgrami = value;
        if (d.label === 'Toplam') toplamDers = value;
        if (d.label === 'Eğitim Türü') egitimTuru = value || 'Online Canlı Eğitim (Zoom)';
      });
    } catch {}

    setNewCamp({
      badge: camp.badge || '',
      title: camp.title || '',
      subtitle: camp.subtitle || '',
      image: camp.image || '',
      description: camp.description || '',
      highlights: highlightsText,
      price: camp.price || '',
      whatsappLink: camp.whatsappLink || '',
      tarih,
      dersProgrami,
      toplamDers,
      egitimTuru
    });
    setEditingCampId(camp.id);
    setCampView('create');
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
      <aside className="w-72 border-r border-primary/10 bg-slate-50/50 p-6 flex flex-col justify-between hidden md:flex h-screen sticky top-0">
        <div className="flex flex-col gap-6 overflow-y-auto">
          <div className="flex items-center gap-3 px-2">
            <img src="/logo.png" alt="Fullematematiği Logo" className="h-12 w-12 object-contain" />
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
            <button 
              onClick={() => { setActiveTab('pdf-notes'); setSelectedStudent(null); }}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'pdf-notes' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-slate-500'}`}
            >
              <span className="material-symbols-outlined">picture_as_pdf</span>
              <span>PDF Not Yayınla</span>
            </button>
            <button 
              onClick={() => { setActiveTab('quota'); setSelectedStudent(null); }}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'quota' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-slate-500'}`}
            >
              <span className="material-symbols-outlined">how_to_reg</span>
              <span>Kontenjan Yönetimi</span>
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
            <a
              href="/ders-notu.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all hover:bg-amber-50 text-slate-500 hover:text-amber-600 mt-2 border border-dashed border-slate-200 hover:border-amber-300"
            >
              <span className="material-symbols-outlined">description</span>
              <span>Ders Notu Oluştur</span>
            </a>
          </nav>
        </div>

        {/* Sidebar Bottom Logout Section */}
        <div className="pt-4 border-t border-slate-200/80 mt-auto">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-red-600 bg-red-50/80 hover:bg-red-100 hover:text-red-700 transition-all border border-red-200/60 shadow-sm hover:shadow cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="h-24 border-b border-primary/5 flex items-center justify-between px-8 sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              {activeTab === 'student-detail' ? `Öğrenci Detayı` : 
               activeTab === 'quota' ? `Kontenjan & Ders Yönetimi` :
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

              {/* BAŞ ÖĞRETMEN ÖZEL - KOD OLUŞTURMA & DERS KAYIT YÖNETİMİ */}
              {user?.role === 'HEAD_TEACHER' && (
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl border border-slate-700 shadow-xl p-6 md:p-8 text-white space-y-6 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700 pb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                        <span className="material-symbols-outlined text-2xl">vpn_key</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-black tracking-wide">Kod Oluştur (Ders Kayıtları)</h3>
                          <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                            Baş Öğretmen Yetkisi
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-bold mt-0.5">
                          Shopier veya özel satış sonrası öğrencilerin sitede indirmeden izleyeceği erişim kodlarını buradan oluşturun.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Kod Oluşturma Formu */}
                  <form onSubmit={handleCreateAccessCode} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-800/80 p-5 rounded-2xl border border-slate-700">
                    <div className="md:col-span-4 space-y-1">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-300">
                        Kişinin / Öğrencinin Adı *
                      </label>
                      <input
                        type="text"
                        required
                        value={newCodePersonName}
                        onChange={(e) => setNewCodePersonName(e.target.value)}
                        placeholder="Örn: Ahmet Yılmaz"
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 font-bold"
                      />
                    </div>

                    <div className="md:col-span-4 space-y-1">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-300">
                        Paket / Ders Adı
                      </label>
                      <input
                        type="text"
                        value={newCodePackageName}
                        onChange={(e) => setNewCodePackageName(e.target.value)}
                        placeholder="Örn: Shopier LGS Matematik Kayıtları"
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 font-bold"
                      />
                    </div>

                    <div className="md:col-span-4 space-y-1">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-300">
                        Google Drive Klasör / Video Linki
                      </label>
                      <input
                        type="text"
                        value={newCodeDriveUrl}
                        onChange={(e) => setNewCodeDriveUrl(e.target.value)}
                        placeholder="https://drive.google.com/drive/u/0/folders/..."
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                      />
                    </div>

                    <div className="md:col-span-12 flex justify-end pt-2">
                      <button
                        type="submit"
                        className="px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-lg">add_circle</span>
                        <span>Kod Oluştur</span>
                      </button>
                    </div>
                  </form>

                  {/* Oluşturulan Kodlar Listesi */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-400 text-base">format_list_bulleted</span>
                      Oluşturulan Kodlar ({accessCodes.length})
                    </h4>

                    {accessCodes.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 font-bold text-xs bg-slate-800/40 rounded-2xl border border-slate-700">
                        Henüz oluşturulmuş erişim kodu bulunmuyor.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-300 border-collapse">
                          <thead>
                            <tr className="border-b border-slate-700 bg-slate-800/60 text-slate-400 font-black uppercase tracking-wider">
                              <th className="p-3.5 rounded-l-xl">Kişi Adı</th>
                              <th className="p-3.5">Erişim Kodu</th>
                              <th className="p-3.5">Paket / Ders</th>
                              <th className="p-3.5">Tarih</th>
                              <th className="p-3.5 text-right rounded-r-xl">İşlem</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 font-medium">
                            {accessCodes.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="p-3.5 font-bold text-white">{item.personName}</td>
                                <td className="p-3.5">
                                  <span className="px-2.5 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-lg font-black uppercase tracking-widest text-xs font-mono">
                                    {item.code}
                                  </span>
                                </td>
                                <td className="p-3.5 text-slate-400">{item.packageName}</td>
                                <td className="p-3.5 text-slate-400">{item.createdAt}</td>
                                <td className="p-3.5 text-right flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyCode(item.code, item.id)}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer border border-slate-700"
                                  >
                                    <span className="material-symbols-outlined text-sm">content_copy</span>
                                    <span>{copiedCodeId === item.id ? 'Kopyalandı!' : 'Kopyala'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAccessCode(item.id)}
                                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all cursor-pointer border border-red-500/20"
                                    title="Kodu Sil"
                                  >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                              Öğrenci: <span className="text-slate-800">{getLessonStudentNames(lesson)}</span>
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
                              onClick={() => handleDeleteLesson(lesson)}
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

                    <button
                      onClick={handleMigrateCatbox}
                      disabled={migrating}
                      className="w-full flex items-center justify-between p-4 bg-amber-50 hover:bg-amber-100 rounded-2xl border border-amber-200 font-bold text-sm text-amber-700 transition-all text-left cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">cloud_sync</span>
                        {migrating ? 'Taşınıyor...' : 'Catbox Kayıtlarını Taşı'}
                      </span>
                      {migrating
                        ? <span className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        : <span className="material-symbols-outlined text-base">chevron_right</span>
                      }
                    </button>
                    {migrateResult && (
                      <div className={`text-xs font-bold px-4 py-3 rounded-2xl ${migrateResult.error ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                        {migrateResult.error
                          ? migrateResult.error
                          : migrateResult.migrated === 0
                            ? migrateResult.message
                            : `${migrateResult.migrated}/${migrateResult.total} kayıt başarıyla Pixeldrain'e taşındı.`
                        }
                      </div>
                    )}
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
                            <td className="py-3 font-bold text-slate-500 text-sm">{(['KPSS', 'Mezun', 'LGS', 'ALES', 'DGS', 'AGS'].includes(student.grade)) ? student.grade : `${student.grade}. Sınıf`}</td>
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
                              <span className="text-slate-700">{(['KPSS', 'Mezun', 'LGS', 'ALES', 'DGS', 'AGS', 'Diğer'].includes(grade)) ? grade : `${grade}. Sınıf`}</span>
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
                {/* Sub-tab switcher: Tüm Öğrenciler vs Sınıflar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStudentSubTab('students')}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                        studentSubTab === 'students'
                          ? 'bg-primary text-white shadow-lg shadow-primary/20'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">group</span>
                      Tüm Öğrenciler ({students.length})
                    </button>
                    <button
                      onClick={() => setStudentSubTab('classes')}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                        studentSubTab === 'classes'
                          ? 'bg-primary text-white shadow-lg shadow-primary/20'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">school</span>
                      Sınıflar / Gruplar ({classrooms.length})
                    </button>
                  </div>
                  {studentSubTab === 'classes' && (
                    <button
                      onClick={() => {
                        setEditingClassroom(null);
                        setClassNameInput('');
                        setClassStudentIdsInput([]);
                        setShowClassModal(true);
                      }}
                      className="flex items-center gap-2 bg-primary hover:bg-primary/95 text-white px-5 py-2.5 rounded-2xl text-xs font-black shadow-md transition-all cursor-pointer self-start sm:self-auto"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      Yeni Sınıf Oluştur
                    </button>
                  )}
                </div>

                {/* Tab Content 1: Tüm Öğrenciler */}
                {studentSubTab === 'students' && (
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
                        <p className="text-sm text-slate-400 font-bold mb-4">{(['KPSS', 'Mezun', 'LGS', 'ALES', 'DGS', 'AGS'].includes(student.grade)) ? student.grade : `${student.grade}. Sınıf`}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl">
                          <span className="material-symbols-outlined text-sm">call</span>
                          {student.studentTel || student.parentTel || 'Telefon yok'}
                        </div>
                        {!messagedStudentIds.includes(student.id) && (student.studentTel || student.parentTel) && (
                          <button
                            onClick={(e) => handleFirstMessage(e, student)}
                            className="mt-3 w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">send</span>
                            İlk Mesajı Gönder
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab Content 2: Sınıflar / Gruplar */}
                {studentSubTab === 'classes' && (
                  <div>
                    {classrooms.length === 0 ? (
                      <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-3">
                        <span className="material-symbols-outlined text-slate-300 text-5xl">school</span>
                        <h4 className="text-base font-black text-slate-800">Henüz Sınıf Oluşturulmamış</h4>
                        <p className="text-xs text-slate-400 font-bold max-w-sm mx-auto">
                          Öğrencilerinizi gruplandırmak ve toplu ders ataması yapmak için yeni bir sınıf oluşturabilirsiniz.
                        </p>
                        <button
                          onClick={() => {
                            setEditingClassroom(null);
                            setClassNameInput('');
                            setClassStudentIdsInput([]);
                            setShowClassModal(true);
                          }}
                          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/95 text-white px-5 py-2.5 rounded-2xl text-xs font-black shadow-md transition-all cursor-pointer mt-2"
                        >
                          <span className="material-symbols-outlined text-sm">add</span>
                          Sınıf Oluştur
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {classrooms.map(cls => {
                          const classStudentNames = (cls.studentIds || [])
                            .map(id => students.find(s => s.id === id)?.name)
                            .filter(Boolean);
                          return (
                            <div key={cls.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all space-y-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-black">
                                    🏫
                                  </div>
                                  <div>
                                    <h4 className="font-black text-slate-900 text-base">{cls.name}</h4>
                                    <span className="text-xs font-bold text-slate-400">{cls.studentIds?.length || 0} Öğrenci</span>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingClassroom(cls);
                                      setClassNameInput(cls.name);
                                      setClassStudentIdsInput(cls.studentIds || []);
                                      setShowClassModal(true);
                                    }}
                                    className="text-slate-300 hover:text-primary transition-colors p-1"
                                    title="Düzenle"
                                  >
                                    <span className="material-symbols-outlined text-base">edit</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClassroom(cls.id, cls.name)}
                                    className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                    title="Sil"
                                  >
                                    <span className="material-symbols-outlined text-base">delete</span>
                                  </button>
                                </div>
                              </div>
                              <div className="border-t border-slate-100 pt-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Sınıftaki Öğrenciler</p>
                                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                                  {classStudentNames.length === 0 ? (
                                    <span className="text-xs text-slate-400 italic">Öğrenci eklenmemiş</span>
                                  ) : (
                                    classStudentNames.map((name, i) => (
                                      <span key={i} className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl">
                                        {name}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Sınıf Oluştur / Düzenle Modal */}
                {showClassModal && (
                  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">
                            🏫
                          </div>
                          <div>
                            <h3 className="font-black text-slate-900 text-lg">
                              {editingClassroom ? 'Sınıfı Düzenle' : 'Yeni Sınıf Oluştur'}
                            </h3>
                            <p className="text-xs text-slate-400 font-semibold">Sınıf adı verip öğrencileri ekleyin</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowClassModal(false)}
                          className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100"
                        >
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      </div>

                      <form onSubmit={handleSaveClassroom} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sınıf Adı</label>
                          <input
                            type="text"
                            placeholder="Örn: 12-A Sayısal, 8-B LGS Derece..."
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 font-bold outline-none focus:border-primary/40 focus:bg-white transition-all text-sm"
                            value={classNameInput}
                            onChange={(e) => setClassNameInput(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between ml-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sınıfa Eklenecek Öğrenciler ({classStudentIdsInput.length})</label>
                            <button
                              type="button"
                              onClick={() => {
                                if (classStudentIdsInput.length === students.length) {
                                  setClassStudentIdsInput([]);
                                } else {
                                  setClassStudentIdsInput(students.map(s => s.id));
                                }
                              }}
                              className="text-[10px] font-black text-primary hover:underline cursor-pointer"
                            >
                              {classStudentIdsInput.length === students.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Öğrenci ara..."
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-900 font-semibold outline-none focus:border-primary/40 text-xs mb-2"
                            value={classStudentSearch}
                            onChange={(e) => setClassStudentSearch(e.target.value)}
                          />
                          <div className="max-h-56 overflow-y-auto border border-slate-100 bg-slate-50/50 rounded-2xl p-3 space-y-1.5">
                            {students.filter(student =>
                              student.name.toLowerCase().includes(classStudentSearch.toLowerCase())
                            ).map(student => {
                              const isChecked = classStudentIdsInput.includes(student.id);
                              return (
                                <label key={student.id} className="flex items-center gap-3 px-3 py-2 hover:bg-white rounded-xl cursor-pointer transition-all border border-transparent hover:border-slate-100 select-none">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setClassStudentIdsInput(prev =>
                                        prev.includes(student.id)
                                          ? prev.filter(id => id !== student.id)
                                          : [...prev, student.id]
                                      );
                                    }}
                                    className="rounded text-primary focus:ring-primary/20 h-4.5 w-4.5 cursor-pointer accent-primary"
                                  />
                                  <span className="text-sm font-bold text-slate-800">
                                    {student.name} <span className="text-xs text-slate-400">({(['KPSS', 'Mezun', 'LGS', 'ALES', 'DGS', 'AGS'].includes(student.grade)) ? student.grade : `${student.grade}. Sınıf`})</span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowClassModal(false)}
                            className="px-5 py-3 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
                          >
                            İptal
                          </button>
                          <button
                            type="submit"
                            className="px-6 py-3 rounded-2xl text-xs font-black bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 transition-all cursor-pointer"
                          >
                            {editingClassroom ? 'Güncelle' : 'Sınıfı Kaydet'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
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
                      <span className="text-xs font-bold text-primary uppercase tracking-widest">{(['KPSS', 'Mezun', 'LGS', 'ALES', 'DGS', 'AGS'].includes(selectedStudent.grade)) ? selectedStudent.grade : `${selectedStudent.grade}. Sınıf`}</span>
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
                                          if (!['KPSS', 'Mezun', 'ALES', 'DGS', 'AGS'].includes(userGrade)) {
                                            if (userGrade === 'LGS' || parseInt(userGrade) <= 8) {
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

                {/* HATA DEFTERİ BÖLÜMÜ */}
                <div className="mt-8 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-red-50 to-orange-50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-red-100 flex items-center justify-center">
                        <span className="text-lg">📒</span>
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-sm">Hata Defteri</h4>
                        <p className="text-[10px] text-slate-400 font-bold">Öğrencinin yülklediği hatalı sorular</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{studentHataDefteri.length} fotoğraf</span>
                  </div>

                  <div className="p-6">
                    {studentHataDefteri.length === 0 ? (
                      <div className="text-center py-10 text-slate-300">
                        <span className="text-4xl">📒</span>
                        <p className="text-xs font-bold mt-2 text-slate-400">Henüz hata fotoğrafı eklenmemiş</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                        {studentHataDefteri.map(entry => (
                          <div
                            key={entry.id}
                            className="relative group rounded-xl overflow-hidden border border-slate-100 shadow-sm aspect-square bg-slate-50 cursor-pointer"
                            onClick={() => setTeacherHataLightbox(entry)}
                          >
                            <img
                              src={entry.imageData}
                              alt={entry.note || 'Hata fotoğrafı'}
                              className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                            />
                            {entry.note && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                                <p className="text-[9px] text-white font-medium truncate">{entry.note}</p>
                              </div>
                            )}
                            <div className="absolute top-1 left-1 bg-black/40 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                              {new Date(entry.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Teacher Hata Defteri Lightbox */}
                {teacherHataLightbox && (
                  <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setTeacherHataLightbox(null)}
                  >
                    <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                      <img
                        src={teacherHataLightbox.imageData}
                        alt={teacherHataLightbox.note || 'Hata fotoğrafı'}
                        className="w-full rounded-2xl shadow-2xl"
                      />
                      {teacherHataLightbox.note && (
                        <div className="mt-3 bg-white/10 rounded-xl px-4 py-2.5">
                          <p className="text-white text-sm font-medium">{teacherHataLightbox.note}</p>
                        </div>
                      )}
                      <p className="text-white/40 text-xs mt-2 text-center">
                        {new Date(teacherHataLightbox.createdAt).toLocaleString('tr-TR')}
                      </p>
                      <button
                        onClick={() => setTeacherHataLightbox(null)}
                        className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-slate-900 font-black flex items-center justify-center shadow-lg"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  </div>
                )}
                {/* ÖDEV VE SORU GÖNDER BÖLÜMÜ */}
                <div className="mt-8 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden space-y-6 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                        <span className="material-symbols-outlined">send</span>
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-sm">Öğrenciye Özel Ödev / Soru Gönder</h4>
                        <p className="text-[10px] text-slate-400 font-bold">Öğrenciye özel mesaj, ödev veya soru iletin</p>
                      </div>
                    </div>
                    {/* Type Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-2xl self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setAssignType('HOMEWORK')}
                        className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          assignType === 'HOMEWORK'
                            ? 'bg-primary text-white shadow-md'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        📝 Ödev
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssignType('QUESTION')}
                        className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          assignType === 'QUESTION'
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ❓ Soru
                      </button>
                    </div>
                  </div>

                  {/* Message Box Form */}
                  <form onSubmit={handleSendAssignmentToStudent} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        {assignType === 'QUESTION' ? 'Soru Mesajı / Notu' : 'Ödev Açıklaması / Talimatlar'}
                      </label>
                      <textarea
                        rows={3}
                        placeholder={assignType === 'QUESTION' ? 'Örn: Bu soruya özellikle bakmanı istiyorum, dikkat et...' : 'Örn: Sayfa 42-45 arası testler çözülecek...'}
                        value={assignText}
                        onChange={(e) => setAssignText(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-medium text-slate-800 outline-none focus:border-primary/40 focus:bg-white transition-all resize-none"
                      />
                    </div>

                    {assignType === 'HOMEWORK' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Son Teslim Tarihi (İsteğe Bağlı)</label>
                        <input
                          type="date"
                          value={assignDeadline}
                          onChange={(e) => setAssignDeadline(e.target.value)}
                          className="w-full sm:w-auto rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-primary/40"
                        />
                      </div>
                    )}

                    {/* Image Attachment */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fotoğraf Ekle (Soru görseli veya ödev ek görseli)</label>
                      {assignImage ? (
                        <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-slate-200 shadow-sm group">
                          <img src={assignImage} alt="Fotoğraf" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setAssignImage('')}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                          >
                            <span className="material-symbols-outlined text-xs">close</span>
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 border border-dashed border-slate-300 hover:border-primary/40 bg-slate-50 hover:bg-primary/5 px-4 py-3 rounded-2xl cursor-pointer text-xs font-bold text-slate-500 hover:text-primary transition-all w-fit">
                          <span className="material-symbols-outlined text-base">add_a_photo</span>
                          Fotoğraf Seç / Çek
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                compressImage(file, (base64) => setAssignImage(base64));
                              }
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={assignSending}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black text-white shadow-lg transition-all cursor-pointer ${
                          assignType === 'QUESTION' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20' : 'bg-primary hover:bg-primary/95 shadow-primary/20'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">send</span>
                        {assignSending ? 'Gönderiliyor...' : assignType === 'QUESTION' ? 'Soruyu Öğrenciye Gönder' : 'Ödevi Öğrenciye Gönder'}
                      </button>
                    </div>
                  </form>

                  {/* Sent Items List */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <h5 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                      Gönderilen Ödevler ve Sorular ({studentHomeworks.length})
                    </h5>
                    {studentHomeworks.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Bu öğrenciye henüz ödev veya soru gönderilmedi.</p>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                        {studentHomeworks.map(sh => {
                          const hw = sh.homework || {};
                          const isQuestion = hw.type === 'QUESTION';
                          const isCompleted = sh.status === 'COMPLETED';
                          return (
                            <div key={sh.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                    isQuestion ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
                                  }`}>
                                    {isQuestion ? '❓ Soru' : '📝 Ödev'}
                                  </span>
                                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {isCompleted ? 'Tamamlandı' : 'Bekliyor'}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleDeleteAssignment(hw.id)}
                                  className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                                  title="Sil"
                                >
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                              </div>

                              <p className="text-xs font-bold text-slate-800 leading-relaxed">
                                {hw.description || hw.title}
                              </p>

                              {hw.imageUrl && (
                                <div className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 cursor-pointer" onClick={() => setAssignLightbox(hw.imageUrl)}>
                                  <img src={hw.imageUrl} alt="Görsel" className="w-full h-full object-cover" />
                                </div>
                              )}

                              {isCompleted && (
                                <div className="p-3 bg-emerald-50/80 border border-emerald-100 rounded-xl space-y-2">
                                  <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                                    Öğrencinin Çözümü ({new Date(sh.submittedAt).toLocaleDateString('tr-TR')})
                                  </p>
                                  {sh.submissionImage && (
                                    <div className="w-24 h-24 rounded-xl overflow-hidden border border-emerald-200 cursor-pointer" onClick={() => setAssignLightbox(sh.submissionImage)}>
                                      <img src={sh.submissionImage} alt="Çözüm Görseli" className="w-full h-full object-cover" />
                                    </div>
                                  )}
                                  {sh.submissionNote && (
                                    <p className="text-xs text-emerald-900 font-medium italic">{sh.submissionNote}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Assignment Lightbox */}
                {assignLightbox && (
                  <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setAssignLightbox(null)}>
                    <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                      <img src={assignLightbox} alt="Görsel" className="w-full rounded-2xl shadow-2xl" />
                      <button onClick={() => setAssignLightbox(null)} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-slate-900 font-black flex items-center justify-center shadow-lg">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  </div>
                )}
             </div>
          )}

          {activeTab === 'new-lesson' && (
            <div className="space-y-8">
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
                                {(lesson.studentId || lesson.studentIds) ? (
                                  <span className="text-[10px] text-slate-400 font-bold">
                                    Öğrenci: {getLessonStudentNames(lesson)}
                                  </span>
                                ) : null}
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
                                onClick={() => handleDeleteLesson(lesson)}
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
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Öğrenci / Sınıf Seçimi</label>
                      
                      {classrooms.length > 0 && (
                        <div className="mb-2 p-2.5 bg-amber-50/60 border border-amber-100 rounded-2xl space-y-1.5">
                          <label className="text-[10px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1">
                            <span>🏫</span> Sınıfa Göre Hızlı Seç
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {classrooms.map(cls => {
                              const clsStudentIds = cls.studentIds || [];
                              const isAllSelected = clsStudentIds.length > 0 && clsStudentIds.every(id => selectedStudentIds.includes(id));
                              return (
                                <button
                                  key={cls.id}
                                  type="button"
                                  onClick={() => toggleClassroomStudents(clsStudentIds, selectedStudentIds, setSelectedStudentIds)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                    isAllSelected
                                      ? 'bg-primary text-white border-primary shadow-sm'
                                      : 'bg-white text-slate-700 border-amber-200/80 hover:bg-amber-100/50'
                                  }`}
                                >
                                  <span>{cls.name}</span>
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-black ${isAllSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                    {clsStudentIds.length}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <input 
                        type="text"
                        placeholder="Bireysel öğrenci adı ile ara..."
                        className="w-full rounded-2xl border border-primary/10 bg-slate-50/50 px-4 py-2.5 text-slate-900 font-semibold focus:ring-2 focus:ring-primary/20 outline-none transition-all text-xs mb-2"
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                      />
                      <div className="max-h-48 overflow-y-auto border border-primary/10 bg-slate-50/50 rounded-2xl p-3 space-y-1.5">
                        {students.filter(student => 
                          student.name.toLowerCase().includes(studentSearchQuery.toLowerCase())
                        ).map(student => {
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
                                {student.name} <span className="text-xs text-slate-400">({(['KPSS', 'Mezun', 'LGS', 'ALES', 'DGS', 'AGS'].includes(student.grade)) ? student.grade : `${student.grade}. Sınıf`})</span>
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

            {/* Recurring Weekly Lesson Series */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h4 className="font-black text-slate-900 mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">event_repeat</span>
                Haftalık Tekrar Eden Ders Serisi Oluştur
              </h4>
              <p className="text-xs text-slate-400 font-semibold mb-6">
                Seçtiğiniz gün ve saatte, belirlediğiniz hafta sayısı kadar ders otomatik olarak oluşturulur.
              </p>
              <form onSubmit={handleCreateRecurringLessons} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ders Başlığı</label>
                  <input
                    className="w-full rounded-2xl border border-primary/10 bg-slate-50/50 px-4 py-3.5 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    placeholder="Örn: TYT Fonksiyonlar"
                    value={recurringTitle}
                    onChange={(e) => setRecurringTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Haftanın Günü</label>
                  <select
                    className="w-full rounded-2xl border border-primary/10 bg-slate-50/50 px-4 py-3.5 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    value={recurringDayOfWeek}
                    onChange={(e) => setRecurringDayOfWeek(parseInt(e.target.value))}
                  >
                    {recurringDayOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    className="w-full rounded-2xl border border-primary/10 bg-slate-50/50 px-4 py-3.5 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    value={recurringStartDate}
                    onChange={(e) => setRecurringStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Saat</label>
                  <input
                    type="time"
                    className="w-full rounded-2xl border border-primary/10 bg-slate-50/50 px-4 py-3.5 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    value={recurringTime}
                    onChange={(e) => setRecurringTime(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kaç Hafta Sürecek</label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    className="w-full rounded-2xl border border-primary/10 bg-slate-50/50 px-4 py-3.5 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    value={recurringWeeks}
                    onChange={(e) => setRecurringWeeks(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Öğrenci / Sınıf Seçimi</label>
                  
                  {classrooms.length > 0 && (
                    <div className="mb-2 p-2.5 bg-amber-50/60 border border-amber-100 rounded-2xl space-y-1.5">
                      <label className="text-[10px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1">
                        <span>🏫</span> Sınıfa Göre Hızlı Seç
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {classrooms.map(cls => {
                          const clsStudentIds = cls.studentIds || [];
                          const isAllSelected = clsStudentIds.length > 0 && clsStudentIds.every(id => recurringStudentIds.includes(id));
                          return (
                            <button
                              key={cls.id}
                              type="button"
                              onClick={() => toggleClassroomStudents(clsStudentIds, recurringStudentIds, setRecurringStudentIds)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                isAllSelected
                                  ? 'bg-primary text-white border-primary shadow-sm'
                                  : 'bg-white text-slate-700 border-amber-200/80 hover:bg-amber-100/50'
                              }`}
                            >
                              <span>{cls.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-black ${isAllSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                {clsStudentIds.length}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <input
                    type="text"
                    placeholder="Bireysel öğrenci adı ile ara..."
                    className="w-full rounded-2xl border border-primary/10 bg-slate-50/50 px-4 py-2.5 text-slate-900 font-semibold focus:ring-2 focus:ring-primary/20 outline-none transition-all text-xs mb-2"
                    value={recurringStudentSearch}
                    onChange={(e) => setRecurringStudentSearch(e.target.value)}
                  />
                  <div className="max-h-48 overflow-y-auto border border-primary/10 bg-slate-50/50 rounded-2xl p-3 space-y-1.5">
                    {students.filter(student =>
                      student.name.toLowerCase().includes(recurringStudentSearch.toLowerCase())
                    ).map(student => {
                      const isChecked = recurringStudentIds.includes(student.id);
                      return (
                        <label key={student.id} className="flex items-center gap-3 px-3 py-2 hover:bg-white rounded-xl cursor-pointer transition-all border border-transparent hover:border-slate-100 select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setRecurringStudentIds(prev =>
                                prev.includes(student.id)
                                  ? prev.filter(id => id !== student.id)
                                  : [...prev, student.id]
                              );
                            }}
                            className="rounded text-primary focus:ring-primary/20 h-4.5 w-4.5 cursor-pointer"
                          />
                          <span className="text-sm font-bold text-slate-800">
                            {student.name} <span className="text-xs text-slate-400">({(['KPSS', 'Mezun', 'LGS', 'ALES', 'DGS', 'AGS'].includes(student.grade)) ? student.grade : `${student.grade}. Sınıf`})</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ders Linki (Zoom, Meet vb. - boş bırakılırsa otomatik oluşturulur)</label>
                  <input
                    className="w-full rounded-2xl border border-primary/10 bg-slate-50/50 px-4 py-3.5 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    placeholder="https://zoom.us/j/... veya Google Meet linki"
                    value={recurringZoomUrl}
                    onChange={(e) => setRecurringZoomUrl(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingRecurring}
                  className="md:col-span-2 w-full py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] hover:shadow-xl transition-all text-sm mt-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {creatingRecurring ? 'Oluşturuluyor...' : 'Ders Serisini Oluştur'}
                </button>
              </form>
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
                      onClick={() => {
                        setEditingCampId(null);
                        setNewCamp({
                          badge: '',
                          title: '',
                          subtitle: '',
                          image: '',
                          description: '',
                          highlights: '',
                          price: '',
                          whatsappLink: '',
                          tarih: '',
                          dersProgrami: '',
                          toplamDers: '',
                          egitimTuru: 'Online Canlı Eğitim (Zoom)'
                        });
                        setCampView('create');
                      }}
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
                            {camp.price && (
                              <span className="inline-block text-xs font-black text-emerald-600 mt-1.5">{camp.price}</span>
                            )}

                            <div className="mt-4 flex items-center justify-end gap-4">
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
                                <>
                                  <button
                                    onClick={() => handleEditCampClick(camp)}
                                    className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1 text-xs font-bold"
                                  >
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                    Düzenle
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmCampId(camp.id)}
                                    className="text-red-500 hover:text-red-600 transition-colors flex items-center gap-1 text-xs font-bold"
                                  >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                    Kampı Sil
                                  </button>
                                </>
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
                        onClick={() => { setCampView('list'); setDeleteConfirmCampId(null); setEditingCampId(null); }}
                        className="h-10 w-10 rounded-full hover:bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 hover:text-primary transition-all"
                      >
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                      </button>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900">{editingCampId ? 'Kampı Düzenle' : 'Yeni Kamp Yayınla'}</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Kart kapak resmi ve kamp detaylarını girin</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setCampView('list'); setDeleteConfirmCampId(null); setEditingCampId(null); }}
                        className="px-6 py-3 border border-slate-200 text-slate-500 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
                      >
                        Vazgeç
                      </button>
                      <button
                        onClick={handleCreateCamp}
                        className="bg-primary text-white px-8 py-3 rounded-2xl font-black text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-lg">{editingCampId ? 'save' : 'publish'}</span>
                        {editingCampId ? 'Güncelle' : 'Yayınla'}
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

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kamp Fiyatı</label>
                      <input
                        className="w-full text-base font-bold outline-none border-b border-slate-100 pb-2 focus:border-primary/20 transition-colors placeholder:text-slate-200 font-bold text-slate-700"
                        placeholder="Örn: 2500 TL"
                        value={newCamp.price}
                        onChange={(e) => setNewCamp({...newCamp, price: e.target.value})}
                        required
                      />
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
                              <p className="text-xs font-bold text-primary mt-1">Sınıf/Seviye: {(['KPSS', 'Mezun', 'LGS', 'ALES', 'DGS', 'AGS'].includes(req.grade)) ? req.grade : `${req.grade}. Sınıf`}</p>
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
                                {(['KPSS', 'Mezun', 'LGS', 'ALES', 'DGS', 'AGS'].includes(student.grade)) ? student.grade : `${student.grade}. Sınıf`}
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
                                    Öğrenci: <span className="text-slate-650">{getLessonStudentNames(lesson)}</span>
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
                            {(['KPSS', 'Mezun', 'LGS', 'ALES', 'DGS', 'AGS'].includes(student.grade)) ? student.grade : `${student.grade}. Sınıf`}
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

          {activeTab === 'pdf-notes' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div>
                  <h3 className="text-xl font-black text-slate-900">PDF Ders Notu Yayınla</h3>
                  <p className="text-xs text-slate-500 font-bold mt-1">Öğrencilerin ve ziyaretçilerin ücretsiz indirebileceği PDF not ve yaprak testleri burada yayınlayabilirsiniz.</p>
                </div>
                <button
                  onClick={() => setShowAddPdfModal(true)}
                  className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-lg">upload_file</span>
                  Yeni PDF Not Yükle
                </button>
              </div>

              {/* PDF Notes List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pdfNotesList.length === 0 ? (
                  <div className="col-span-full bg-white p-12 rounded-3xl border border-slate-100 shadow-sm text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-300">picture_as_pdf</span>
                    <h4 className="font-black text-slate-700 text-base mt-2">Henüz Yayınlanmış Not Bulunmuyor</h4>
                    <p className="text-xs text-slate-400 font-medium mt-1">Yukarıdaki butona tıklayarak ilk PDF ders notunuzu hemen yayınlayabilirsiniz.</p>
                  </div>
                ) : (
                  pdfNotesList.map(note => (
                    <div key={note.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="bg-primary/10 text-primary border border-primary/20 px-3 py-0.5 rounded-full text-[10px] font-black uppercase">
                            {note.category || 'Genel'}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            {new Date(note.createdAt).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                        <h4 className="font-black text-slate-900 text-base leading-snug">{note.title}</h4>
                        {note.description && (
                          <p className="text-xs text-slate-500 font-medium mt-2 line-clamp-2">{note.description}</p>
                        )}
                      </div>

                      <div className="pt-4 border-t border-slate-50 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-400">
                          Yazar: {note.author?.name || 'Siz'}
                        </span>
                        <div className="flex items-center gap-2">
                          <a
                            href={note.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
                            title="PDF'i İncele"
                          >
                            <span className="material-symbols-outlined text-base">visibility</span>
                          </a>
                          <button
                            onClick={() => handleDeletePdfNote(note.id)}
                            className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer"
                            title="Notu Sil"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'quota' && (
            <div className="p-8 space-y-8 animate-in fade-in duration-300">
              {/* Header & Stats Banner */}
              <div className="bg-slate-900 text-white rounded-[32px] p-8 shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <span className="px-3 py-1 bg-primary/20 text-primary text-xs font-black uppercase tracking-widest rounded-full">
                      Kontenjan & Ders Yönetimi
                    </span>
                    <h3 className="text-3xl font-black mt-2">Ders & Kontenjan Paneli</h3>
                    <p className="text-slate-400 text-xs font-medium mt-1">
                      YKS 2027, LGS 2027, KPSS 2027 ve Maarif Modeli kategorilerinde yayınlanacak dersleri düzenleyin ve gelen öğrenci başvurularını takip edin.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingQuotaId(null);
                      setQuotaFormState({
                        category: quotaCatFilter,
                        title: '',
                        description: '',
                        published: true,
                        tracks: ['Sayısal', 'Eşit Ağırlık', 'Sözel', 'Yabancı Dil'],
                        totalQuota: 20,
                        remainingQuota: 5,
                        price: '3.500 TL',
                        image: '/IMG_2943.jpeg',
                        whatsappLink: ''
                      });
                      setShowQuotaCourseModal(true);
                    }}
                    className="px-6 py-4 bg-primary hover:bg-primary/90 text-white font-black text-sm rounded-2xl shadow-lg shadow-primary/30 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined">add_circle</span>
                    <span>Yeni Ders Ekle</span>
                  </button>
                </div>

                {/* Category Tabs */}
                <div className="flex items-center gap-3 mt-6 pt-6 border-t border-slate-800 flex-wrap">
                  {['YKS 2027', 'LGS 2027', 'KPSS 2027', 'MAARIF'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setQuotaCatFilter(cat)}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        quotaCatFilter === cat
                          ? 'bg-primary text-white shadow-md shadow-primary/30 font-black scale-105'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {cat === 'MAARIF' ? 'MAARİF MODELİ' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 1: Derslerimiz Sayfasındaki Kamplar & Kategori Eşleştirme */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">school</span>
                    <span>Derslerimiz Sayfası Kampları ({quotaCatFilter === 'MAARIF' ? 'MAARİF MODELİ' : quotaCatFilter})</span>
                  </h4>
                  <span className="text-xs font-bold text-slate-400">
                    Öğretmenin yayınladığı derslerimiz kartlarının kategori eşleştirmesi
                  </span>
                </div>

                {(!campsList || campsList.length === 0) ? (
                  <div className="bg-white rounded-3xl p-10 text-center border border-slate-100">
                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">folder_open</span>
                    <p className="text-slate-500 font-bold text-sm">Henüz Eğitim Kampları sekmesinde yayınlanmış ders bulunmuyor.</p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {campsList.map((camp) => {
                      const isMatchingCategory = isCampCategoryActive(camp, quotaCatFilter);

                      return (
                        <div key={camp.id} className={`bg-white rounded-3xl border p-6 shadow-sm flex flex-col justify-between space-y-4 transition-all ${isMatchingCategory ? 'border-primary/40 ring-2 ring-primary/10' : 'border-slate-100'}`}>
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-primary/10 text-primary">
                                {camp.badge || 'Eğitim Kampı'}
                              </span>
                              {isMatchingCategory && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-black text-[10px] rounded-full flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">check_circle</span>
                                  <span>{quotaCatFilter === 'MAARIF' ? 'MAARİF' : quotaCatFilter} Seçili</span>
                                </span>
                              )}
                            </div>

                            <h5 className="font-black text-slate-900 text-base">{camp.title}</h5>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{camp.description}</p>
                            <div className="mt-3 text-xs font-black text-primary">{camp.price || 'Ücret Bilgisi'}</div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                              Sınav Kategorileriyle Eşleştir (Çoklu Seçim):
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                              {['YKS 2027', 'LGS 2027', 'KPSS 2027', 'MAARIF'].map((cat) => {
                                const isActive = isCampCategoryActive(camp, cat);
                                return (
                                  <button
                                    key={cat}
                                    type="button"
                                    onClick={() => handleToggleCampCategory(camp, cat)}
                                    className={`px-2.5 py-2 rounded-xl text-[10px] font-bold flex items-center justify-between transition-all cursor-pointer ${
                                      isActive
                                        ? 'bg-primary text-white font-black shadow-md shadow-primary/20 scale-102'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                  >
                                    <span>{cat === 'MAARIF' ? 'MAARİF' : cat}</span>
                                    <span className="material-symbols-outlined text-xs">
                                      {isActive ? 'check_box' : 'check_box_outline_blank'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section 2: Gelen Kontenjan Başvuruları / Yer Ayırtanlar */}
              <div className="space-y-4 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">person_add</span>
                    <span>Gelen Yer Ayırtma & Kontenjan Başvuruları ({quotaAppsList.length})</span>
                  </h4>
                  <span className="text-xs font-bold text-slate-400">
                    Öğrencilerin yer ayırttığı ders, alan ve doğrulanmış iletişim bilgileri
                  </span>
                </div>

                {quotaAppsList.length === 0 ? (
                  <div className="bg-white rounded-3xl p-10 text-center border border-slate-100">
                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">inbox</span>
                    <p className="text-slate-500 font-bold text-sm">Henüz gelen yer ayırtma başvurusu bulunmuyor.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black uppercase tracking-wider">
                          <tr>
                            <th className="py-4 px-6">Öğrenci Adı Soyadı</th>
                            <th className="py-4 px-6">Telefon Numarası</th>
                            <th className="py-4 px-6">E-posta</th>
                            <th className="py-4 px-6">Kategori & Ders</th>
                            <th className="py-4 px-6">Seçilen Alan</th>
                            <th className="py-4 px-6">Tarih</th>
                            <th className="py-4 px-6 text-right">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {quotaAppsList.map((app) => (
                            <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 px-6 font-black text-slate-900">{app.studentName || 'İsimsiz'}</td>
                              <td className="py-4 px-6">
                                {app.phone ? (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-900">{app.phone}</span>
                                    <a
                                      href={`https://wa.me/90${(app.phone || '').toString().replace(/\D/g, '').replace(/^0/, '')}?text=Merhaba%20${encodeURIComponent(app.studentName||'')},%20${encodeURIComponent(app.courseTitle||'')} (${encodeURIComponent(app.track||'')})%20başvurunuz%20hakkında%20ulaşıyorum.`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] rounded-lg shadow-sm flex items-center gap-1 transition-all"
                                      title="WhatsApp üzerinden doğrudan mesaj atın"
                                    >
                                      <span className="material-symbols-outlined text-xs">chat</span>
                                      <span>WhatsApp</span>
                                    </a>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-4 px-6">{app.email || '-'}</td>
                              <td className="py-4 px-6">
                                <span className="font-bold text-slate-900 block">{app.category || '-'}</span>
                                <span className="text-slate-400 text-[11px]">{app.courseTitle || '-'}</span>
                              </td>
                              <td className="py-4 px-6">
                                <span className="px-2.5 py-1 bg-primary/10 text-primary font-black rounded-lg text-[11px]">
                                  {app.track || '-'}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-slate-400 text-[11px]">
                                {app.createdAt ? new Date(app.createdAt).toLocaleDateString('tr-TR') : '-'}
                              </td>
                              <td className="py-4 px-6 text-right">
                                <button
                                  onClick={() => handleDeleteQuotaApplication(app.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                  title="Sil"
                                >
                                  <span className="material-symbols-outlined text-base">delete</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Add/Edit Quota Course Modal */}
              {showQuotaCourseModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                      <h3 className="text-xl font-black text-slate-900">
                        {editingQuotaId ? 'Kontenjan Dersi Düzenle' : 'Yeni Kontenjan Dersi Ekle'}
                      </h3>
                      <button
                        onClick={() => setShowQuotaCourseModal(false)}
                        className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>

                    <form onSubmit={handleSaveQuotaCourse} className="space-y-4">
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Kategori</label>
                        <select
                          value={quotaFormState.category}
                          onChange={(e) => setQuotaFormState({ ...quotaFormState, category: e.target.value })}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 font-bold outline-none"
                        >
                          <option value="YKS 2027">YKS 2027</option>
                          <option value="LGS 2027">LGS 2027</option>
                          <option value="KPSS 2027">KPSS 2027</option>
                          <option value="MAARIF">MAARİF MODELİ</option>
                        </select>
                      </div>

                      <div className="bg-primary/5 p-3 rounded-2xl border border-primary/20">
                        <label className="block text-xs font-black text-primary uppercase tracking-widest mb-1">
                          Derslerimiz Sayfasındaki Ders ile Eşleştir (Opsiyonel)
                        </label>
                        <select
                          onChange={(e) => {
                            const selectedCampTitle = e.target.value;
                            if (selectedCampTitle) {
                              const foundCamp = campsList.find(c => c.title === selectedCampTitle);
                              setQuotaFormState(prev => ({
                                ...prev,
                                title: selectedCampTitle,
                                description: foundCamp?.description || prev.description,
                                price: foundCamp?.price || prev.price,
                                image: foundCamp?.image || prev.image
                              }));
                            }
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 font-bold outline-none text-xs"
                        >
                          <option value="">-- Derslerimiz Sayfasından Bir Ders Seçin --</option>
                          {campsList.map(camp => (
                            <option key={camp.id} value={camp.title}>{camp.title} ({camp.price || 'Ücretsiz'})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Ders Adı *</label>
                        <input
                          type="text"
                          required
                          placeholder="Örn: TYT Matematik Canlı Kampı"
                          value={quotaFormState.title}
                          onChange={(e) => setQuotaFormState({ ...quotaFormState, title: e.target.value })}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 font-bold outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Açıklama</label>
                        <textarea
                          placeholder="Ders içeriği, soru çözüm detayları vb."
                          value={quotaFormState.description}
                          onChange={(e) => setQuotaFormState({ ...quotaFormState, description: e.target.value })}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 font-bold outline-none h-20"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Toplam Kontenjan</label>
                          <input
                            type="number"
                            value={quotaFormState.totalQuota}
                            onChange={(e) => setQuotaFormState({ ...quotaFormState, totalQuota: parseInt(e.target.value) || 0 })}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 font-bold outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Kalan Kontenjan</label>
                          <input
                            type="number"
                            value={quotaFormState.remainingQuota}
                            onChange={(e) => setQuotaFormState({ ...quotaFormState, remainingQuota: parseInt(e.target.value) || 0 })}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 font-bold outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Fiyat</label>
                        <input
                          type="text"
                          placeholder="Örn: 3.500 TL"
                          value={quotaFormState.price}
                          onChange={(e) => setQuotaFormState({ ...quotaFormState, price: e.target.value })}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 font-bold outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id="publishedCheck"
                          checked={quotaFormState.published}
                          onChange={(e) => setQuotaFormState({ ...quotaFormState, published: e.target.checked })}
                          className="w-4 h-4 rounded text-primary cursor-pointer"
                        />
                        <label htmlFor="publishedCheck" className="text-xs font-bold text-slate-700 cursor-pointer">Sitede Hemen Yayınla</label>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-black text-sm rounded-2xl shadow-lg shadow-primary/20 transition-all mt-4 cursor-pointer"
                      >
                        Kaydet ve Yayınla
                      </button>
                    </form>
                  </div>
                </div>
              )}
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
                    {[5,6,7].map(g => <option key={g} value={g}>{g}. Sınıf</option>)}
                    <option value="LGS">LGS (8. Sınıf)</option>
                    {[9,10,11,12].map(g => <option key={g} value={g}>{g}. Sınıf</option>)}
                    <option value="Mezun">Mezun</option>
                    <option value="AGS">AGS</option>
                    <option value="ALES">ALES</option>
                    <option value="DGS">DGS</option>
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
                    {[5,6,7].map(g => <option key={g} value={g}>{g}. Sınıf</option>)}
                    <option value="LGS">LGS (8. Sınıf)</option>
                    {[9,10,11,12].map(g => <option key={g} value={g}>{g}. Sınıf</option>)}
                    <option value="Mezun">Mezun</option>
                    <option value="AGS">AGS</option>
                    <option value="ALES">ALES</option>
                    <option value="DGS">DGS</option>
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

      {/* Add PDF Note Modal */}
      {showAddPdfModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[36px] shadow-2xl p-8 relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowAddPdfModal(false)} className="absolute right-6 top-6 text-slate-300 hover:text-slate-900 transition-colors">
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
            <h3 className="text-2xl font-black text-slate-900 mb-1">Yeni PDF Not Yayınla</h3>
            <p className="text-slate-400 font-bold text-xs mb-6 uppercase tracking-wider">Ders Notu Detaylarını Giriniz</p>

            <form onSubmit={handlePublishPdfNote} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase ml-1 block mb-1">Ders Notu / Test Başlığı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: 8. Sınıf Üslü İfadeler Çalışma Fasikülü"
                  value={newPdfTitle}
                  onChange={e => setNewPdfTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase ml-1 block mb-1">Kategori / Sınıf Seviyesi</label>
                <select
                  value={newPdfCategory}
                  onChange={e => setNewPdfCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary"
                >
                  <option value="LGS">LGS Matematik</option>
                  <option value="YKS">YKS (TYT/AYT) Matematik</option>
                  <option value="KPSS">KPSS Matematik</option>
                  <option value="9. Sınıf">9. Sınıf</option>
                  <option value="10. Sınıf">10. Sınıf</option>
                  <option value="11. Sınıf">11. Sınıf</option>
                  <option value="12. Sınıf">12. Sınıf</option>
                  <option value="Genel">Genel Matematik</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase ml-1 block mb-1">Açıklama / Not Detayları</label>
                <textarea
                  rows="3"
                  placeholder="Bu ders notunda hangi konular anlatılıyor?"
                  value={newPdfDescription}
                  onChange={e => setNewPdfDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:border-primary"
                ></textarea>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase ml-1 block mb-1">PDF Dosyası Seç *</label>
                <input
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                      if (file.size > 25 * 1024 * 1024) {
                        alert('PDF dosyası 25MB sınırından büyük olamaz.');
                        return;
                      }
                      setNewPdfFileName(file.name);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setNewPdfBase64(reader.result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddPdfModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl text-xs hover:bg-slate-200 transition-all"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={pdfPublishing}
                  className="flex-1 py-3 bg-primary text-white font-black rounded-2xl text-xs shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {pdfPublishing ? (
                    <span>Yayınlanıyor...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">publish</span>
                      <span>Notu Yayınla</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;

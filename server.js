import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'portal-aluno-secret-dev';

// Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ VITE_SUPABASE_URL and VITE_SUPABASE_KEY are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ===== Helper: Get school data =====
async function getSchoolData() {
  const { data, error } = await supabase
    .from('school_data')
    .select('data')
    .eq('id', 1)
    .single();

  if (error) throw new Error('Erro ao buscar dados da escola: ' + error.message);
  return data?.data || {};
}

// ===== Auth Middleware =====
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// ===================================================
// PUBLIC ROUTES
// ===================================================

// POST /api/portal/login
app.post('/api/portal/login', async (req, res) => {
  try {
    const { enrollmentNumber, password } = req.body;
    if (!enrollmentNumber || !password) {
      return res.status(400).json({ error: 'Matrícula e senha são obrigatórios' });
    }

    const schoolData = await getSchoolData();
    const students = schoolData.students || [];

    const student = students.find(
      (s) => s.enrollmentNumber && s.enrollmentNumber.toLowerCase() === enrollmentNumber.toLowerCase()
    );

    if (!student) {
      return res.status(401).json({ error: 'Matrícula não encontrada' });
    }

    // Check password
    const expectedPassword = student.portalPassword || (student.cpf ? student.cpf.replace(/\D/g, '').substring(0, 6) : '');
    if (password !== expectedPassword) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    if (student.status !== 'active') {
      return res.status(403).json({ error: 'Sua matrícula está inativa. Entre em contato com a secretaria.' });
    }

    // Generate JWT
    const tokenPayload = {
      studentId: student.id,
      enrollmentNumber: student.enrollmentNumber,
      name: student.name,
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    // Find class and course
    const studentClass = (schoolData.classes || []).find((c) => c.id === student.classId) || null;
    const course = studentClass
      ? (schoolData.courses || []).find((c) => c.id === studentClass.courseId) || null
      : null;

    res.json({
      token,
      user: tokenPayload,
      student: {
        ...student,
        portalPassword: undefined, // Don't expose password
      },
      class: studentClass,
      course,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/portal/escola
app.get('/api/portal/escola', async (req, res) => {
  try {
    const schoolData = await getSchoolData();
    res.json({
      name: schoolData.profile?.name || 'Escola',
      logo: schoolData.logo || null,
      profile: schoolData.profile || null,
    });
  } catch (err) {
    console.error('Escola error:', err);
    res.status(500).json({ error: 'Erro ao buscar dados da escola' });
  }
});

// ===================================================
// PROTECTED ROUTES
// ===================================================

// GET /api/portal/me
app.get('/api/portal/me', authMiddleware, async (req, res) => {
  try {
    const schoolData = await getSchoolData();
    const student = (schoolData.students || []).find((s) => s.id === req.user.studentId);
    if (!student) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    const studentClass = (schoolData.classes || []).find((c) => c.id === student.classId) || null;
    const course = studentClass
      ? (schoolData.courses || []).find((c) => c.id === studentClass.courseId) || null
      : null;

    res.json({
      student: { ...student, portalPassword: undefined },
      class: studentClass,
      course,
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/portal/financeiro
app.get('/api/portal/financeiro', authMiddleware, async (req, res) => {
  try {
    const schoolData = await getSchoolData();
    const payments = (schoolData.payments || []).filter(
      (p) => p.studentId === req.user.studentId
    );
    res.json({ payments });
  } catch (err) {
    console.error('Financeiro error:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/portal/boletos
app.get('/api/portal/boletos', authMiddleware, async (req, res) => {
  try {
    const { data: boletos, error } = await supabase
      .from('alunos_cobrancas')
      .select('*')
      .eq('aluno_id', req.user.studentId)
      .order('vencimento', { ascending: true });

    if (error) {
      console.error('Boletos query error:', error);
      return res.json({ boletos: [] });
    }

    res.json({ boletos: boletos || [] });
  } catch (err) {
    console.error('Boletos error:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/portal/notas
app.get('/api/portal/notas', authMiddleware, async (req, res) => {
  try {
    const schoolData = await getSchoolData();
    const student = (schoolData.students || []).find(s => s.id === req.user.studentId);
    const studentClass = (schoolData.classes || []).find(c => c.id === student?.classId);
    
    const grades = (schoolData.grades || []).filter(
      (g) => g.studentId === req.user.studentId
    );
    const subjects = schoolData.subjects || [];

    // Filter subjects that belong to the student's class (match the schema in types.ts)
    const courseSubjects = subjects.filter(s => 
      !s.classId || s.classId === student?.classId
    );

    // Enrich grades with subject name
    const enrichedGrades = grades.map((g) => {
      const subject = subjects.find((s) => s.id === g.subjectId);
      return { ...g, subjectName: subject?.name || 'Disciplina desconhecida' };
    });

    // Collect unique periods
    const periods = [...new Set(grades.map((g) => g.period))];
    if (periods.length === 0) periods.push('1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre');
    periods.sort();

    res.json({ 
      grades: enrichedGrades, 
      periods,
      allSubjects: courseSubjects // Send the complete list of subjects for this course
    });
  } catch (err) {
    console.error('Notas error:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/portal/frequencia
app.get('/api/portal/frequencia', authMiddleware, async (req, res) => {
  try {
    const schoolData = await getSchoolData();
    const attendance = (schoolData.attendance || []).filter(
      (a) => a.studentId === req.user.studentId
    );
    res.json({ attendance });
  } catch (err) {
    console.error('Frequencia error:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/portal/frequencia/justificar
app.post('/api/portal/frequencia/justificar', authMiddleware, async (req, res) => {
  try {
    const { date, justification } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: 'A data da aula é obrigatória' });
    }
    if (!justification || justification.trim() === '') {
      return res.status(400).json({ error: 'A justificativa é obrigatória' });
    }

    const { data: schoolRow, error: fetchError } = await supabase
      .from('school_data')
      .select('data')
      .eq('id', 1)
      .single();

    if (fetchError) throw fetchError;

    const schoolData = schoolRow?.data || {};
    const attendance = schoolData.attendance || [];
    const notifications = schoolData.notifications || [];
    const student = (schoolData.students || []).find(s => s.id === req.user.studentId);
    
    // Use the full ISO string (including time) to distinguish between multiple lessons on same day
    const fullDateStr = date; 
    let recordIndex = attendance.findIndex(a => 
      a.studentId === req.user.studentId && 
      a.date === fullDateStr
    );
    
    if (recordIndex !== -1) {
      // Record exists — check if it's a presence
      const existing = attendance[recordIndex];
      if (existing.type === 'presence') {
        return res.status(400).json({ error: 'Não é possível justificar uma presença' });
      }
      // Update with justification
      attendance[recordIndex] = { ...existing, justification: justification.trim() };
    } else {
      // No attendance record exists — create one as absence with justification
      const newRecord = {
        id: `att-just-${Date.now()}`,
        studentId: req.user.studentId,
        classId: student?.classId || '',
        date: fullDateStr,
        verified: false,
        type: 'absence',
        justification: justification.trim(),
      };
      attendance.push(newRecord);
      recordIndex = attendance.length - 1;
    }
    
    // Extract attachment if present for the notification
    let attachment = null;
    try {
      const parsedJust = JSON.parse(justification);
      attachment = parsedJust.arquivo_base64 || null;
    } catch (e) {}

    // Create notification for the admin
    notifications.push({
      id: `notif-${Date.now()}`,
      studentId: 'admin',
      title: 'Nova Justificativa de Falta',
      message: `${student?.name || 'Aluno'} enviou uma justificativa para a aula de ${date}.`,
      attachment: attachment, // New field for the EduManager UI
      read: false,
      createdAt: new Date().toISOString(),
    });
    
    schoolData.attendance = attendance;
    schoolData.notifications = notifications;
    
    const { error: updateError } = await supabase
      .from('school_data')
      .update({ data: schoolData })
      .eq('id', 1);

    if (updateError) throw updateError;
    
    res.json({ 
      message: 'Justificativa enviada com sucesso', 
      record: attendance[recordIndex] 
    });
  } catch (err) {
    console.error('Justificativa error:', err);
    res.status(500).json({ error: 'Erro interno ao salvar justificativa' });
  }
});

// GET /api/portal/contratos
app.get('/api/portal/contratos', authMiddleware, async (req, res) => {
  try {
    const schoolData = await getSchoolData();
    const contracts = (schoolData.contracts || []).filter(
      (c) => c.studentId === req.user.studentId
    );
    res.json({ contracts });
  } catch (err) {
    console.error('Contratos error:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/portal/certificados
app.get('/api/portal/certificados', authMiddleware, async (req, res) => {
  try {
    const schoolData = await getSchoolData();
    const certificates = (schoolData.certificates || []).filter(
      (c) => c.studentId === req.user.studentId
    );
    res.json({ certificates });
  } catch (err) {
    console.error('Certificados error:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/portal/config (Para suportar Supabase Realtime no Frontend)
app.get('/api/portal/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    supabaseAnonKey: process.env.VITE_SUPABASE_KEY,
  });
});

// GET /api/portal/aulas (lessons from SchoolData JSON)
app.get('/api/portal/aulas', authMiddleware, async (req, res) => {
  try {
    const schoolData = await getSchoolData();
    // Find the student to get their classId
    const student = (schoolData.students || []).find(s => s.id === req.user.studentId);
    if (!student) return res.json({ lessons: [] });

    const parseDateHelper = (dStr) => {
      if (!dStr) return 0;
      const parts = dStr.substring(0, 10).split(/[-/]/);
      if (parts.length < 3) return 0;
      // If first part is year (YYYY-MM-DD)
      if (parts[0].length === 4) return new Date(parts[0], parts[1] - 1, parts[2]).getTime();
      // If last part is year (DD-MM-YYYY)
      return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
    };

    // Filter lessons by student classId and sort chronologically
    const lessons = (schoolData.lessons || [])
      .filter(l => l.classId === student.classId)
      .sort((a, b) => parseDateHelper(a.date) - parseDateHelper(b.date));

    res.json({ lessons });
  } catch (err) {
    console.error('Aulas error:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/portal/notificacoes (notifications from SchoolData JSON)
app.get('/api/portal/notificacoes', authMiddleware, async (req, res) => {
  try {
    const schoolData = await getSchoolData();
    const notifications = (schoolData.notifications || [])
      .filter(n => n.studentId === req.user.studentId)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    res.json({ notifications });
  } catch (err) {
    console.error('Notificacoes error:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /api/portal/notificacoes/ler/:id (mark as read via SchoolData JSON update)
app.put('/api/portal/notificacoes/ler/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: schoolRow, error: fetchError } = await supabase
      .from('school_data')
      .select('data')
      .eq('id', 1)
      .single();

    if (fetchError) throw fetchError;

    const schoolData = schoolRow?.data || {};
    const notifications = schoolData.notifications || [];

    const idx = notifications.findIndex(n => n.id === id && n.studentId === req.user.studentId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    notifications[idx] = { ...notifications[idx], read: true };
    schoolData.notifications = notifications;

    const { error: updateError } = await supabase
      .from('school_data')
      .update({ data: schoolData })
      .eq('id', 1);

    if (updateError) throw updateError;

    res.json({ success: true });
  } catch (err) {
    console.error('Notificacoes ler error:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /api/portal/alterar-senha
app.put('/api/portal/alterar-senha', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórios' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 4 caracteres' });
    }

    // Get full data
    const { data: schoolRow, error: fetchError } = await supabase
      .from('school_data')
      .select('data')
      .eq('id', 1)
      .single();

    if (fetchError) throw fetchError;

    const schoolData = schoolRow?.data || {};
    const students = schoolData.students || [];
    const studentIndex = students.findIndex((s) => s.id === req.user.studentId);

    if (studentIndex === -1) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    const student = students[studentIndex];
    const expectedPassword = student.portalPassword || (student.cpf ? student.cpf.replace(/\D/g, '').substring(0, 6) : '');

    if (currentPassword !== expectedPassword) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    // Update password
    students[studentIndex] = { ...student, portalPassword: newPassword };
    schoolData.students = students;

    const { error: updateError } = await supabase
      .from('school_data')
      .update({ data: schoolData })
      .eq('id', 1);

    if (updateError) throw updateError;

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err) {
    console.error('Alterar senha error:', err);
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

// ===================================================
// SERVE FRONTEND (Production)
// ===================================================
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ===================================================
// START SERVER
// ===================================================
app.listen(PORT, () => {
  console.log(`🚀 Portal do Aluno rodando na porta ${PORT}`);
  console.log(`📡 Supabase: ${supabaseUrl}`);
});

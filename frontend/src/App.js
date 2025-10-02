import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { BookOpen, MessageSquare, FileText, Pill, Search, Upload, Plus, Trash2, Brain, Library, Activity } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [stats, setStats] = useState({ total_documents: 0, categories: {} });
  const [documents, setDocuments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    fetchDocuments();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API}/documents`);
      setDocuments(response.data.slice(0, 5));
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  return (
    <div className="space-y-6" data-testid="dashboard">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-2">
          Overzicht van je kennisbank en recente activiteiten
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="stats-total-docs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totaal Documenten</CardTitle>
            <Library className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_documents}</div>
          </CardContent>
        </Card>

        <Card data-testid="stats-categories">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorieën</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats.categories).length}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/consult')} data-testid="quick-consult-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consult Assistent</CardTitle>
            <Brain className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Start een consult →</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/treatment')} data-testid="quick-treatment-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Behandelplan</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Maak behandelplan →</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recente Documenten</CardTitle>
          <CardDescription>Laatst toegevoegde kennis aan je database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nog geen documenten toegevoegd</p>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors" data-testid={`doc-item-${doc.id}`}>
                  <div className="flex-1">
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">{doc.category}</p>
                  </div>
                  <Badge variant="outline">{doc.file_type}</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const KnowledgeBase = () => {
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newDoc, setNewDoc] = useState({
    title: "",
    category: "artikel",
    file_type: "text",
    content: "",
    tags: ""
  });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API}/documents`);
      setDocuments(response.data);
    } catch (error) {
      toast.error("Fout bij ophalen documenten");
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchDocuments();
      return;
    }
    try {
      const response = await axios.get(`${API}/documents/search/${searchQuery}`);
      setDocuments(response.data);
    } catch (error) {
      toast.error("Fout bij zoeken");
    }
  };

  const handleAddDocument = async () => {
    if (!newDoc.title || !newDoc.content) {
      toast.error("Titel en inhoud zijn verplicht");
      return;
    }

    try {
      const docData = {
        ...newDoc,
        tags: newDoc.tags.split(",").map(tag => tag.trim()).filter(tag => tag)
      };
      await axios.post(`${API}/documents`, docData);
      toast.success("Document toegevoegd!");
      setNewDoc({ title: "", category: "artikel", file_type: "text", content: "", tags: "" });
      setShowAddForm(false);
      fetchDocuments();
    } catch (error) {
      toast.error("Fout bij toevoegen document");
    }
  };

  const handleDeleteDocument = async (id) => {
    try {
      await axios.delete(`${API}/documents/${id}`);
      toast.success("Document verwijderd");
      fetchDocuments();
    } catch (error) {
      toast.error("Fout bij verwijderen");
    }
  };

  return (
    <div className="space-y-6" data-testid="knowledge-base">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Kennisbank</h2>
          <p className="text-muted-foreground mt-2">Beheer al je artikelen, onderzoeken en aantekeningen</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} data-testid="add-document-btn">
          <Plus className="h-4 w-4 mr-2" />
          Document Toevoegen
        </Button>
      </div>

      {showAddForm && (
        <Card data-testid="add-document-form">
          <CardHeader>
            <CardTitle>Nieuw Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Titel"
              value={newDoc.title}
              onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
              data-testid="doc-title-input"
            />
            <div className="grid grid-cols-2 gap-4">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newDoc.category}
                onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value })}
                data-testid="doc-category-select"
              >
                <option value="artikel">Artikel</option>
                <option value="onderzoek">Onderzoek</option>
                <option value="boek">Boek</option>
                <option value="dictaat">Dictaat</option>
                <option value="aantekening">Aantekening</option>
                <option value="supplement">Supplement Info</option>
                <option value="kruiden">Kruiden Info</option>
              </select>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newDoc.file_type}
                onChange={(e) => setNewDoc({ ...newDoc, file_type: e.target.value })}
                data-testid="doc-filetype-select"
              >
                <option value="text">Text</option>
                <option value="pdf">PDF</option>
                <option value="docx">Word</option>
                <option value="note">Notitie</option>
              </select>
            </div>
            <Textarea
              placeholder="Inhoud van het document..."
              value={newDoc.content}
              onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
              rows={6}
              data-testid="doc-content-textarea"
            />
            <Input
              placeholder="Tags (gescheiden door komma's)"
              value={newDoc.tags}
              onChange={(e) => setNewDoc({ ...newDoc, tags: e.target.value })}
              data-testid="doc-tags-input"
            />
            <div className="flex gap-2">
              <Button onClick={handleAddDocument} data-testid="save-document-btn">Opslaan</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)} data-testid="cancel-add-btn">Annuleren</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Zoek in documenten..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          data-testid="search-input"
        />
        <Button onClick={handleSearch} data-testid="search-btn">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4">
        {documents.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">Geen documenten gevonden</p>
            </CardContent>
          </Card>
        ) : (
          documents.map((doc) => (
            <Card key={doc.id} data-testid={`document-card-${doc.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{doc.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {doc.category} • {new Date(doc.created_at).toLocaleDateString('nl-NL')}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteDocument(doc.id)}
                    data-testid={`delete-doc-${doc.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">{doc.content}</p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {doc.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

const ConsultAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId] = useState(`session-${Date.now()}`);
  const [loading, setLoading] = useState(false);
  const [contextType, setContextType] = useState("consult");

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages([...messages, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await axios.post(`${API}/chat`, {
        session_id: sessionId,
        message: input,
        context_type: contextType
      });

      const assistantMessage = { role: "assistant", content: response.data.response };
      setMessages([...messages, userMessage, assistantMessage]);
    } catch (error) {
      toast.error("Fout bij versturen bericht");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="consult-assistant">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Consult Assistent</h2>
        <p className="text-muted-foreground mt-2">Chat met je AI assistent tijdens consulten</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>AI Chat met Claude Sonnet 4</CardTitle>
            <select
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={contextType}
              onChange={(e) => setContextType(e.target.value)}
              data-testid="context-type-select"
            >
              <option value="consult">Consult Mode</option>
              <option value="general">Algemeen</option>
              <option value="treatment">Behandeling</option>
              <option value="supplement">Supplement</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4" data-testid="chat-messages">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Start een gesprek met je AI assistent</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    data-testid={`chat-message-${idx}`}
                  >
                    <div
                      className={`max-w-[80%] p-4 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">AI aan het denken...</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="flex gap-2 mt-4">
            <Input
              placeholder="Stel een vraag..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={loading}
              data-testid="chat-input"
            />
            <Button onClick={sendMessage} disabled={loading} data-testid="send-message-btn">
              Verstuur
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const TreatmentPlan = () => {
  const [form, setForm] = useState({
    patient_info: "",
    symptoms: "",
    diagnosis: ""
  });
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const generatePlan = async () => {
    if (!form.patient_info || !form.symptoms) {
      toast.error("Vul minimaal patiënt info en symptomen in");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/treatment-plan`, form);
      setResult(response.data.treatment_plan);
      toast.success("Behandelplan gegenereerd!");
    } catch (error) {
      toast.error("Fout bij genereren behandelplan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="treatment-plan">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Behandelplan Generator</h2>
        <p className="text-muted-foreground mt-2">Genereer gedetailleerde behandelplannen met AI</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Patiënt Informatie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Patiënt Info</label>
              <Textarea
                placeholder="Leeftijd, geslacht, medische geschiedenis..."
                value={form.patient_info}
                onChange={(e) => setForm({ ...form, patient_info: e.target.value })}
                rows={4}
                data-testid="patient-info-textarea"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Symptomen</label>
              <Textarea
                placeholder="Beschrijf de symptomen..."
                value={form.symptoms}
                onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
                rows={4}
                data-testid="symptoms-textarea"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Diagnose (optioneel)</label>
              <Textarea
                placeholder="Diagnose of werkdiagnose..."
                value={form.diagnosis}
                onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                rows={3}
                data-testid="diagnosis-textarea"
              />
            </div>
            <Button onClick={generatePlan} disabled={loading} className="w-full" data-testid="generate-plan-btn">
              {loading ? "Genereren..." : "Genereer Behandelplan"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Behandelplan</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {result ? (
                <div className="prose prose-sm max-w-none" data-testid="treatment-result">
                  <pre className="whitespace-pre-wrap text-sm">{result}</pre>
                </div>
              ) : (
                <div className="text-center py-20 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Het behandelplan verschijnt hier</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const SupplementAdvice = () => {
  const [form, setForm] = useState({
    condition: "",
    patient_details: ""
  });
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const getAdvice = async () => {
    if (!form.condition) {
      toast.error("Vul de conditie in");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/supplement-advice`, form);
      setResult(response.data.advice);
      toast.success("Advies gegenereerd!");
    } catch (error) {
      toast.error("Fout bij genereren advies");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="supplement-advice">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Supplement & Kruiden Advies</h2>
        <p className="text-muted-foreground mt-2">AI-gedreven advies voor supplementen, kruiden en gemmo therapie</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Advies Aanvragen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Conditie/Klacht</label>
              <Textarea
                placeholder="Beschrijf de conditie waarvoor je advies wilt..."
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value })}
                rows={4}
                data-testid="condition-textarea"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Patiënt Details</label>
              <Textarea
                placeholder="Relevante patiënt informatie (leeftijd, medicatie, allergieën, etc.)..."
                value={form.patient_details}
                onChange={(e) => setForm({ ...form, patient_details: e.target.value })}
                rows={5}
                data-testid="patient-details-textarea"
              />
            </div>
            <Button onClick={getAdvice} disabled={loading} className="w-full" data-testid="get-advice-btn">
              {loading ? "Genereren..." : "Vraag Advies"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supplement Advies</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {result ? (
                <div className="prose prose-sm max-w-none" data-testid="supplement-result">
                  <pre className="whitespace-pre-wrap text-sm">{result}</pre>
                </div>
              ) : (
                <div className="text-center py-20 text-muted-foreground">
                  <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Het advies verschijnt hier</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-white border-r border-gray-200 overflow-hidden`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Wellness Archive</h1>
              <p className="text-xs text-gray-500">Kennisbank Systeem</p>
            </div>
          </div>

          <nav className="space-y-2">
            <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-700" data-testid="nav-dashboard">
              <Activity className="h-5 w-5" />
              <span className="font-medium">Dashboard</span>
            </Link>
            <Link to="/knowledge" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-700" data-testid="nav-knowledge">
              <Library className="h-5 w-5" />
              <span className="font-medium">Kennisbank</span>
            </Link>
            <Link to="/consult" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-700" data-testid="nav-consult">
              <MessageSquare className="h-5 w-5" />
              <span className="font-medium">Consult Assistent</span>
            </Link>
            <Link to="/treatment" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-700" data-testid="nav-treatment">
              <FileText className="h-5 w-5" />
              <span className="font-medium">Behandelplan</span>
            </Link>
            <Link to="/supplements" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-700" data-testid="nav-supplements">
              <Pill className="h-5 w-5" />
              <span className="font-medium">Supplementen</span>
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/knowledge" element={<KnowledgeBase />} />
            <Route path="/consult" element={<ConsultAssistant />} />
            <Route path="/treatment" element={<TreatmentPlan />} />
            <Route path="/supplements" element={<SupplementAdvice />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </div>
  );
}

export default App;
import { useState, useEffect, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BookOpen, MessageSquare, FileText, Pill, Search, Upload, Plus, Trash2, Brain, Library, Activity, Download, FileUp, Copy, Edit, Save, X, Eye, Tag, FolderPlus, ExternalLink, Settings } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Category Management Component
const CategoryManager = ({ onCategoryAdded }) => {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error("Categorie naam is verplicht");
      return;
    }

    try {
      await axios.post(`${API}/categories`, newCategory);
      toast.success("Categorie toegevoegd!");
      setNewCategory({ name: "", description: "" });
      setShowAddForm(false);
      fetchCategories();
      if (onCategoryAdded) onCategoryAdded();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Fout bij toevoegen categorie");
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await axios.delete(`${API}/categories/${id}`);
      toast.success("Categorie verwijderd");
      fetchCategories();
      if (onCategoryAdded) onCategoryAdded();
    } catch (error) {
      toast.error("Fout bij verwijderen");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Categorieën Beheren</h3>
        <Button
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          data-testid="toggle-category-form-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nieuwe Categorie
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Input
              placeholder="Categorie naam"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              data-testid="category-name-input"
            />
            <Input
              placeholder="Beschrijving (optioneel)"
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              data-testid="category-description-input"
            />
            <div className="flex gap-2">
              <Button onClick={handleAddCategory} size="sm" data-testid="save-category-btn">
                Opslaan
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(false)}
              >
                Annuleren
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-white"
            data-testid={`category-item-${cat.id}`}
          >
            <div className="flex-1">
              <p className="font-medium text-sm">{cat.name}</p>
              {cat.description && (
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteCategory(cat.id)}
              data-testid={`delete-category-${cat.id}`}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState({ total_documents: 0, categories: {} });
  const [documents, setDocuments] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [categoryDocuments, setCategoryDocuments] = useState([]);
  const [tagDocuments, setTagDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
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

  const handleCategoryClick = async (categoryName) => {
    setSelectedCategory(categoryName);
    setSelectedTag(null);
    setSelectedDocument(null);
    try {
      const response = await axios.get(`${API}/documents?category=${categoryName}`);
      setCategoryDocuments(response.data);
    } catch (error) {
      toast.error("Fout bij ophalen documenten");
    }
  };

  const handleTagClick = async (tagName) => {
    setSelectedTag(tagName);
    setSelectedCategory(null);
    setSelectedDocument(null);
    try {
      const response = await axios.get(`${API}/documents/by-tag/${encodeURIComponent(tagName)}`);
      setTagDocuments(response.data);
    } catch (error) {
      toast.error("Fout bij ophalen documenten met tag");
    }
  };

  const handleDocumentClick = (doc) => {
    setSelectedDocument(doc);
  };

  const handleBackToMain = () => {
    setSelectedCategory(null);
    setSelectedTag(null);
    setSelectedDocument(null);
    setCategoryDocuments([]);
    setTagDocuments([]);
  };

  const handleBackToList = () => {
    setSelectedDocument(null);
  };

  // View 1: Main Dashboard
  if (!selectedCategory && !selectedTag) {
    return (
      <div className="space-y-6" data-testid="dashboard">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-2">
            Overzicht van je kennisbank en categorieën
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card data-testid="stats-total-docs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totaal Documenten</CardTitle>
              <Library className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_documents}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Alle documenten in kennisbank
              </p>
            </CardContent>
          </Card>

          <Card data-testid="stats-categories">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categorieën</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(stats.categories).length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Verschillende categorieën
              </p>
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
        </div>

        {/* Categories Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Categorieën</CardTitle>
            <CardDescription>Klik op een categorie om alle documenten te bekijken</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(stats.categories).map(([categoryName, count]) => (
                <div
                  key={categoryName}
                  onClick={() => handleCategoryClick(categoryName)}
                  className="p-6 border rounded-lg hover:border-teal-500 hover:bg-teal-50 cursor-pointer transition-all group"
                  data-testid={`category-card-${categoryName}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold capitalize group-hover:text-teal-700">
                      {categoryName}
                    </h3>
                    <FileText className="h-5 w-5 text-gray-400 group-hover:text-teal-600" />
                  </div>
                  <p className="text-2xl font-bold text-teal-600">{count}</p>
                  <p className="text-sm text-muted-foreground">
                    {count === 1 ? 'document' : 'documenten'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Recente Documenten</CardTitle>
            <CardDescription>Laatst toegevoegde kennis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nog geen documenten toegevoegd</p>
              ) : (
                documents.map((doc) => (
                  <div 
                    key={doc.id} 
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer" 
                    data-testid={`doc-item-${doc.id}`}
                    onClick={() => navigate('/knowledge')}
                  >
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
  }

  // View 2: Documents in Category
  if (selectedCategory && !selectedDocument) {
    return (
      <div className="space-y-6" data-testid="category-documents-view">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBackToMain} data-testid="back-to-categories-btn">
            ← Terug naar Dashboard
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight capitalize">{selectedCategory}</h2>
            <p className="text-muted-foreground mt-2">
              {categoryDocuments.length} {categoryDocuments.length === 1 ? 'document' : 'documenten'}
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          {categoryDocuments.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">Geen documenten in deze categorie</p>
              </CardContent>
            </Card>
          ) : (
            categoryDocuments.map((doc) => (
              <Card 
                key={doc.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleDocumentClick(doc)}
                data-testid={`category-doc-${doc.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{doc.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {new Date(doc.created_at).toLocaleDateString('nl-NL')}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{doc.file_type}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{doc.content}</p>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {doc.tags.slice(0, 5).map((tag, idx) => (
                      <Badge 
                        key={idx} 
                        variant="secondary" 
                        className="bg-teal-100 text-teal-800 cursor-pointer hover:bg-teal-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTagClick(tag);
                        }}
                        data-testid={`doc-tag-${tag}`}
                      >
                        {tag}
                      </Badge>
                    ))}
                    {doc.tags.length > 5 && (
                      <Badge variant="secondary">+{doc.tags.length - 5}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  // View 3: Documents with Tag
  if (selectedTag && !selectedDocument) {
    return (
      <div className="space-y-6" data-testid="tag-documents-view">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBackToMain} data-testid="back-to-main-btn">
            ← Terug naar Dashboard
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Tag className="h-8 w-8 text-teal-600" />
              {selectedTag}
            </h2>
            <p className="text-muted-foreground mt-2">
              {tagDocuments.length} {tagDocuments.length === 1 ? 'document' : 'documenten'} met deze tag
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          {tagDocuments.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">Geen documenten met deze tag</p>
              </CardContent>
            </Card>
          ) : (
            tagDocuments.map((doc) => (
              <Card 
                key={doc.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleDocumentClick(doc)}
                data-testid={`tag-doc-${doc.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{doc.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {doc.category} • {new Date(doc.created_at).toLocaleDateString('nl-NL')}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{doc.file_type}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{doc.content}</p>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {doc.tags.map((tag, idx) => (
                      <Badge 
                        key={idx} 
                        variant="secondary" 
                        className={`cursor-pointer hover:bg-teal-200 ${tag === selectedTag ? 'bg-teal-200 text-teal-900 border-2 border-teal-600' : 'bg-teal-100 text-teal-800'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTagClick(tag);
                        }}
                        data-testid={`tag-badge-${tag}`}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  // View 4: Document Details
  if (selectedDocument) {
    const backLabel = selectedTag ? selectedTag : selectedCategory;
    
    const handleEdit = () => {
      navigate(`/document/${selectedDocument.id}`);
    };
    
    const handleDelete = async () => {
      if (window.confirm(`Weet je zeker dat je "${selectedDocument.title}" wilt verwijderen?`)) {
        try {
          await axios.delete(`${API}/documents/${selectedDocument.id}`);
          toast.success("Document verwijderd");
          handleBackToList();
          // Refresh the list
          if (selectedTag) {
            handleTagClick(selectedTag);
          } else if (selectedCategory) {
            handleCategoryClick(selectedCategory);
          }
        } catch (error) {
          toast.error("Fout bij verwijderen");
        }
      }
    };
    
    return (
      <div className="space-y-6" data-testid="document-detail-view">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handleBackToList} data-testid="back-to-documents-btn">
            ← Terug naar {backLabel}
          </Button>
          <div className="flex gap-2">
            <Button onClick={handleEdit} data-testid="edit-document-btn">
              <Edit className="h-4 w-4 mr-2" />
              Bewerken
            </Button>
            <Button variant="destructive" onClick={handleDelete} data-testid="delete-document-btn">
              <Trash2 className="h-4 w-4 mr-2" />
              Verwijderen
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{selectedDocument.title}</CardTitle>
            <CardDescription>
              {selectedDocument.category} • {new Date(selectedDocument.created_at).toLocaleDateString('nl-NL')}
              {selectedDocument.was_translated && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  🌐 Vertaald uit Engels
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tags */}
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </h3>
              <div className="flex gap-2 flex-wrap">
                {selectedDocument.tags.map((tag, idx) => (
                  <Badge 
                    key={idx} 
                    variant="secondary" 
                    className="bg-teal-100 text-teal-800 cursor-pointer hover:bg-teal-200"
                    onClick={() => handleTagClick(tag)}
                    data-testid={`detail-tag-${tag}`}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* References */}
            {selectedDocument.references && selectedDocument.references.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Referenties</h3>
                <div className="space-y-1 bg-gray-50 p-4 rounded-lg">
                  {selectedDocument.references.map((ref, idx) => (
                    <p key={idx} className="text-sm text-gray-700">• {ref}</p>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Content */}
            <div>
              <h3 className="font-semibold mb-3">Inhoud</h3>
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed bg-gray-50 p-4 rounded-lg">
                  {selectedDocument.content}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

const KnowledgeBase = () => {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [importType, setImportType] = useState("paste");
  const [pasteForm, setPasteForm] = useState({
    title: "",
    content: "",
    category: "artikel"
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    category: "artikel"
  });
  const [editForm, setEditForm] = useState({
    title: "",
    category: "",
    tags: "",
    references: "",
    content: ""
  });
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: ""
  });
  const [uploading, setUploading] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState(new Set());
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [blogForm, setBlogForm] = useState({
    title: "",
    category: "Blog Articles",
    customInstructions: ""
  });
  const [creatingBlog, setCreatingBlog] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

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

  const viewDocument = (doc) => {
    navigate(`/document/${doc.id}`);
  };

  const handleViewDocument = async (docId) => {
    try {
      const response = await axios.get(`${API}/documents/${docId}`);
      setSelectedDoc(response.data);
      setEditForm({
        title: response.data.title,
        category: response.data.category,
        tags: response.data.tags.join(", "),
        references: response.data.references.join("\n"),
        content: response.data.content
      });
      setEditMode(false);
    } catch (error) {
      toast.error("Fout bij ophalen document");
    }
  };

  const handleUpdateDocument = async () => {
    if (!selectedDoc) return;

    try {
      const updateData = {
        title: editForm.title,
        category: editForm.category,
        tags: editForm.tags.split(",").map(t => t.trim()).filter(t => t),
        references: editForm.references.split("\n").map(r => r.trim()).filter(r => r),
        content: editForm.content
      };

      await axios.put(`${API}/documents/${selectedDoc.id}`, updateData);
      toast.success("Document bijgewerkt!");
      setEditMode(false);
      fetchDocuments();
      handleViewDocument(selectedDoc.id);
    } catch (error) {
      toast.error("Fout bij bijwerken document");
    }
  };

  const handleDeleteSelectedDocument = async () => {
    if (!selectedDoc) return;
    
    if (window.confirm(`Weet je zeker dat je "${selectedDoc.title}" wilt verwijderen?`)) {
      try {
        await axios.delete(`${API}/documents/${selectedDoc.id}`);
        toast.success("Document verwijderd");
        setSelectedDoc(null);
        setEditMode(false);
        fetchDocuments();
      } catch (error) {
        toast.error("Fout bij verwijderen document");
      }
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error("Categorie naam is verplicht");
      return;
    }

    try {
      await axios.post(`${API}/categories`, newCategory);
      toast.success("Categorie toegevoegd!");
      setNewCategory({ name: "", description: "" });
      setShowCategoryModal(false);
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Fout bij toevoegen categorie");
    }
  };

  const handleDeleteCategory = async (catId) => {
    try {
      await axios.delete(`${API}/categories/${catId}`);
      toast.success("Categorie verwijderd");
      fetchCategories();
    } catch (error) {
      toast.error("Fout bij verwijderen categorie");
    }
  };

  const handleDocumentSelect = (docId) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocuments(newSelected);
  };

  const handleCreateBlog = () => {
    if (selectedDocuments.size === 0) {
      toast.error("Selecteer minimaal één document om een blog artikel te maken");
      return;
    }
    setShowBlogModal(true);
  };

  const handleBlogSubmit = async () => {
    if (!blogForm.title.trim()) {
      toast.error("Blog titel is verplicht");
      return;
    }

    setCreatingBlog(true);
    try {
      const response = await axios.post(`${API}/blog/create`, {
        document_ids: Array.from(selectedDocuments),
        title: blogForm.title,
        category: blogForm.category,
        custom_instructions: blogForm.customInstructions
      });

      toast.success("Blog artikel succesvol gegenereerd!");
      
      // Reset form and selections
      setBlogForm({ title: "", category: "Blog Articles", customInstructions: "" });
      setSelectedDocuments(new Set());
      setShowBlogModal(false);
      
      // Refresh documents to show new blog article
      fetchDocuments();
      
      // Navigate to the new blog article
      if (response.data.blog_id) {
        navigate(`/document/${response.data.blog_id}`);
      }
      
    } catch (error) {
      toast.error(error.response?.data?.detail || "Fout bij maken blog artikel");
    } finally {
      setCreatingBlog(false);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pasteForm.title || !pasteForm.content) {
      toast.error("Titel en inhoud zijn verplicht");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", pasteForm.title);
      formData.append("content", pasteForm.content);
      formData.append("category", pasteForm.category);

      const response = await axios.post(`${API}/documents/paste`, formData);
      toast.success("Document toegevoegd met AI-gegenereerde tags & referenties! 🎯");
      setPasteForm({ title: "", content: "", category: "artikel" });
      setShowImportModal(false);
      fetchDocuments();
    } catch (error) {
      toast.error("Fout bij toevoegen document");
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) {
      toast.error("Selecteer een bestand");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadForm.title || uploadFile.name);
      formData.append("category", uploadForm.category);

      const response = await axios.post(`${API}/documents/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      
      toast.success("Bestand geüpload met AI-gegenereerde tags & referenties! 🎯");
      setUploadFile(null);
      setUploadForm({ title: "", category: "artikel" });
      setShowImportModal(false);
      fetchDocuments();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Fout bij uploaden");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (id) => {
    try {
      await axios.delete(`${API}/documents/${id}`);
      toast.success("Document verwijderd");
      if (selectedDoc?.id === id) {
        setSelectedDoc(null);
      }
      fetchDocuments();
    } catch (error) {
      toast.error("Fout bij verwijderen");
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setUploadFile(file);
      setImportType("upload");
    }
  };

  // Get all category names (custom + default)
  const allCategories = [
    ...categories.map(c => c.name),
    "artikel", "onderzoek", "boek", "dictaat", "aantekening", "supplement", "kruiden"
  ];
  const uniqueCategories = [...new Set(allCategories)];

  return (
    <div className="space-y-6" data-testid="knowledge-base">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Kennisbank</h2>
          <p className="text-muted-foreground mt-2">Beheer al je artikelen, onderzoeken en aantekeningen</p>
        </div>
        <div className="flex gap-2">
          {selectedDocuments.size > 0 && (
            <Button 
              onClick={handleCreateBlog} 
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" 
              data-testid="create-blog-btn"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Blog Maken ({selectedDocuments.size})
            </Button>
          )}
          <Button onClick={() => setShowCategoryModal(true)} variant="outline" data-testid="manage-categories-btn">
            <Settings className="h-4 w-4 mr-2" />
            Categorieën
          </Button>
          <Button onClick={() => setShowImportModal(true)} className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700" data-testid="import-document-btn">
            <Upload className="h-4 w-4 mr-2" />
            Kennis Importeren
          </Button>
        </div>
      </div>

      {/* Category Management Modal */}
      {showCategoryModal && (
        <Card className="border-2 border-blue-500 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Categorieën Beheren</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowCategoryModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Nieuwe categorie naam"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                data-testid="new-category-name"
              />
              <Input
                placeholder="Beschrijving (optioneel)"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                data-testid="new-category-description"
              />
              <Button onClick={handleAddCategory} className="w-full" data-testid="add-category-btn">
                <Plus className="h-4 w-4 mr-2" />
                Categorie Toevoegen
              </Button>
            </div>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-semibold">Aangepaste Categorieën</h4>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nog geen aangepaste categorieën</p>
              ) : (
                categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-2 rounded border">
                    <div>
                      <p className="font-medium">{cat.name}</p>
                      {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCategory(cat.id)}
                      data-testid={`delete-category-${cat.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <Card className="border-2 border-teal-500 shadow-lg" data-testid="import-modal">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-teal-600" />
                  Kennis Importeren (met AI Tag & Referentie Detectie)
                </CardTitle>
                <CardDescription>Upload een bestand of plak tekst - AI genereert automatisch relevante tags en detecteert referenties</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowImportModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={importType} onValueChange={setImportType}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="paste" data-testid="paste-tab">
                  <Copy className="h-4 w-4 mr-2" />
                  Tekst Plakken
                </TabsTrigger>
                <TabsTrigger value="upload" data-testid="upload-tab">
                  <FileUp className="h-4 w-4 mr-2" />
                  Bestand Uploaden
                </TabsTrigger>
              </TabsList>

              {/* Paste Content */}
              <TabsContent value="paste" className="space-y-4 mt-4">
                <Input
                  placeholder="Titel van het document"
                  value={pasteForm.title}
                  onChange={(e) => setPasteForm({ ...pasteForm, title: e.target.value })}
                  data-testid="paste-title-input"
                />
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={pasteForm.category}
                  onChange={(e) => setPasteForm({ ...pasteForm, category: e.target.value })}
                  data-testid="paste-category-select"
                >
                  {uniqueCategories.sort().map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <Textarea
                  placeholder="Plak hier de tekst van je document..."
                  value={pasteForm.content}
                  onChange={(e) => setPasteForm({ ...pasteForm, content: e.target.value })}
                  rows={12}
                  data-testid="paste-content-textarea"
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={handlePasteSubmit} 
                    disabled={uploading}
                    className="bg-teal-600 hover:bg-teal-700"
                    data-testid="paste-submit-btn"
                  >
                    {uploading ? "Verwerken..." : "Opslaan met AI Tags & Referenties"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowImportModal(false)} data-testid="cancel-import-btn">
                    Annuleren
                  </Button>
                </div>
              </TabsContent>

              {/* Upload File */}
              <TabsContent value="upload" className="space-y-4 mt-4">
                <Input
                  placeholder="Titel (optioneel, gebruikt bestandsnaam als leeg)"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  data-testid="upload-title-input"
                />
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  data-testid="upload-category-select"
                >
                  {uniqueCategories.sort().map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-teal-500 transition-colors"
                  onDrop={handleFileDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="file-drop-zone"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.gif,.bmp,.webp"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="hidden"
                    data-testid="file-input"
                  />
                  {uploadFile ? (
                    <div className="space-y-2">
                      <FileText className="h-12 w-12 mx-auto text-teal-600" />
                      <p className="font-medium">{uploadFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-12 w-12 mx-auto text-gray-400" />
                      <p className="text-sm font-medium">Sleep een bestand hierheen of klik om te selecteren</p>
                      <p className="text-xs text-muted-foreground">Ondersteund: PDF, DOCX, TXT, JPG, PNG, GIF</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleFileUpload} 
                    disabled={uploading || !uploadFile}
                    className="bg-teal-600 hover:bg-teal-700"
                    data-testid="upload-submit-btn"
                  >
                    {uploading ? "Uploaden..." : "Upload met AI Tags & Referenties"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowImportModal(false)}>
                    Annuleren
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Document List */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Documenten ({documents.length})</h3>
          <ScrollArea className="h-[600px]">
            <div className="space-y-3 pr-4">
              {documents.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <p className="text-muted-foreground">Nog geen documenten. Begin met importeren!</p>
                  </CardContent>
                </Card>
              ) : (
                documents.map((doc) => (
                  <Card 
                    key={doc.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${selectedDoc?.id === doc.id ? 'border-2 border-teal-500' : ''} ${selectedDocuments.has(doc.id) ? 'bg-purple-50 border-purple-300' : ''}`}
                    onClick={() => handleViewDocument(doc.id)}
                    data-testid={`document-card-${doc.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedDocuments.has(doc.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleDocumentSelect(doc.id);
                            }}
                            className="mt-1 h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            data-testid={`select-doc-${doc.id}`}
                          />
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-1">{doc.title}</h4>
                            <p className="text-xs text-muted-foreground mb-2">
                              {doc.category} • {new Date(doc.created_at).toLocaleDateString('nl-NL')}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{doc.content}</p>
                            <div className="flex gap-1 flex-wrap">
                              {doc.tags.slice(0, 3).map((tag, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs bg-teal-100 text-teal-800">{tag}</Badge>
                              ))}
                              {doc.tags.length > 3 && (
                                <Badge variant="secondary" className="text-xs">+{doc.tags.length - 3}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDocument(doc.id);
                          }}
                          data-testid={`delete-doc-${doc.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Document Detail View */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Document Details</h3>
            {selectedDoc && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(!editMode)}
                  data-testid="toggle-edit-btn"
                >
                  {editMode ? <X className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
                  {editMode ? 'Annuleren' : 'Bewerken'}
                </Button>
                {!editMode && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelectedDocument}
                    data-testid="delete-doc-btn"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Verwijderen
                  </Button>
                )}
              </div>
            )}
          </div>

          {!selectedDoc ? (
            <Card>
              <CardContent className="py-20 text-center">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Selecteer een document om details te bekijken</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <ScrollArea className="h-[560px] pr-4">
                  {editMode ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Titel</label>
                        <Input
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          data-testid="edit-title-input"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Categorie</label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={editForm.category}
                          onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                          data-testid="edit-category-select"
                        >
                          {uniqueCategories.sort().map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Tags (gescheiden door komma's)</label>
                        <Textarea
                          value={editForm.tags}
                          onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                          rows={2}
                          data-testid="edit-tags-input"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Referenties/Bronnen (één per regel)</label>
                        <Textarea
                          value={editForm.references}
                          onChange={(e) => setEditForm({ ...editForm, references: e.target.value })}
                          rows={4}
                          placeholder="Voeg bronnen toe, één per regel..."
                          data-testid="edit-references-input"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Inhoud</label>
                        <Textarea
                          value={editForm.content}
                          onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                          rows={12}
                          data-testid="edit-content-textarea"
                        />
                      </div>
                      <Button onClick={handleUpdateDocument} className="w-full" data-testid="save-edit-btn">
                        <Save className="h-4 w-4 mr-2" />
                        Wijzigingen Opslaan
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-2xl font-bold mb-2">{selectedDoc.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                          <Badge>{selectedDoc.category}</Badge>
                          <span>•</span>
                          <span>{new Date(selectedDoc.created_at).toLocaleDateString('nl-NL')}</span>
                          {selectedDoc.updated_at && (
                            <>
                              <span>•</span>
                              <span>Bijgewerkt: {new Date(selectedDoc.updated_at).toLocaleDateString('nl-NL')}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Tags</h4>
                          <div className="flex gap-2 flex-wrap">
                            {selectedDoc.tags.map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="bg-teal-100 text-teal-800">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedDoc.references && selectedDoc.references.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Referenties & Bronnen</h4>
                          <div className="bg-blue-50 p-3 rounded-lg space-y-1">
                            {selectedDoc.references.map((ref, idx) => (
                              <p key={idx} className="text-xs text-blue-900">• {ref}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator />

                      <div>
                        <h4 className="text-sm font-semibold mb-2">Inhoud</h4>
                        <div className="prose prose-sm max-w-none">
                          <pre className="whitespace-pre-wrap text-sm font-sans">{selectedDoc.content}</pre>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        <p>Bestandstype: {selectedDoc.file_type}</p>
                        {selectedDoc.file_size && <p>Grootte: {(selectedDoc.file_size / 1024).toFixed(2)} KB</p>}
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// Document Detail View Component
const DocumentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    category: "",
    tags: "",
    references: "",
    content: ""
  });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchDocument();
    fetchCategories();
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/documents/${id}`);
      setDocument(response.data);
      setEditForm({
        title: response.data.title,
        category: response.data.category,
        tags: response.data.tags.join(", "),
        references: response.data.references?.join("\n") || "",
        content: response.data.content
      });
    } catch (error) {
      toast.error("Fout bij laden document");
      navigate("/knowledge");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      const updateData = {
        title: editForm.title,
        category: editForm.category,
        tags: editForm.tags.split(",").map(t => t.trim()).filter(t => t),
        references: editForm.references.split("\n").map(r => r.trim()).filter(r => r),
        content: editForm.content
      };

      await axios.put(`${API}/documents/${id}`, updateData);
      toast.success("Document bijgewerkt!");
      setEditMode(false);
      fetchDocument();
    } catch (error) {
      toast.error("Fout bij opslaan");
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Weet je zeker dat je dit document wilt verwijderen?")) {
      try {
        await axios.delete(`${API}/documents/${id}`);
        toast.success("Document verwijderd");
        navigate("/knowledge");
      } catch (error) {
        toast.error("Fout bij verwijderen");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Laden...</p>
      </div>
    );
  }

  if (!document) return null;

  return (
    <div className="space-y-6" data-testid="document-detail">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate("/knowledge")} data-testid="back-to-knowledge-btn">
          ← Terug naar Kennisbank
        </Button>
        <div className="flex gap-2">
          {!editMode ? (
            <>
              <Button onClick={() => setEditMode(true)} data-testid="edit-document-btn">
                <Edit className="h-4 w-4 mr-2" />
                Bewerken
              </Button>
              <Button variant="destructive" onClick={handleDelete} data-testid="delete-document-btn">
                <Trash2 className="h-4 w-4 mr-2" />
                Verwijderen
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleSaveChanges} data-testid="save-changes-btn">
                <Save className="h-4 w-4 mr-2" />
                Opslaan
              </Button>
              <Button variant="outline" onClick={() => {
                setEditMode(false);
                fetchDocument();
              }}>
                <X className="h-4 w-4 mr-2" />
                Annuleren
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Show original file if available */}
      {document.has_original_file ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Origineel Document
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* PDF Viewer */}
            {document.file_type === 'pdf' && (
              <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
                <iframe
                  src={`${API}/documents/${id}/file`}
                  className="w-full h-full"
                  title="Original Document"
                  data-testid="original-document-viewer"
                />
              </div>
            )}
            
            {/* Image Viewer */}
            {['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(document.file_type) && (
              <div className="border rounded-lg overflow-hidden bg-gray-50 p-4 flex justify-center">
                <img
                  src={`${API}/documents/${id}/file`}
                  alt={document.title}
                  className="max-w-full max-h-[600px] object-contain"
                  data-testid="original-image-viewer"
                />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // Show message for old documents without original file
        ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(document.file_type) && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="py-4">
              <p className="text-sm text-amber-800">
                ℹ️ Dit document werd geüpload voordat de viewer functie werd toegevoegd. 
                Upload het bestand opnieuw om het origineel te kunnen bekijken.
              </p>
            </CardContent>
          </Card>
        )
      )}

      <Card>
        <CardHeader>
          {editMode ? (
            <Input
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="text-2xl font-bold"
              data-testid="edit-title-input"
            />
          ) : (
            <CardTitle className="text-3xl">{document.title}</CardTitle>
          )}
          <CardDescription>
            {editMode ? (
              <select
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                data-testid="edit-category-select"
              >
                <option value="artikel">Artikel</option>
                <option value="onderzoek">Onderzoek</option>
                <option value="boek">Boek</option>
                <option value="dictaat">Dictaat</option>
                <option value="aantekening">Aantekening</option>
                <option value="supplement">Supplement Info</option>
                <option value="kruiden">Kruiden Info</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            ) : (
              <span>{document.category} • {new Date(document.created_at).toLocaleDateString('nl-NL')}</span>
            )}
            {document.updated_at && !editMode && (
              <span className="ml-2 text-xs">(Bijgewerkt: {new Date(document.updated_at).toLocaleDateString('nl-NL')})</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tags Section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4" />
              <h3 className="font-semibold">Tags</h3>
            </div>
            {editMode ? (
              <Input
                value={editForm.tags}
                onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                placeholder="Tags gescheiden door komma's"
                data-testid="edit-tags-input"
              />
            ) : (
              <div className="flex gap-2 flex-wrap">
                {document.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-teal-100 text-teal-800">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* References Section */}
          {(document.references?.length > 0 || editMode) && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="h-4 w-4" />
                <h3 className="font-semibold">Referenties / Bronnen</h3>
              </div>
              {editMode ? (
                <Textarea
                  value={editForm.references}
                  onChange={(e) => setEditForm({ ...editForm, references: e.target.value })}
                  placeholder="Referenties (elke referentie op een nieuwe regel)"
                  rows={4}
                  data-testid="edit-references-textarea"
                />
              ) : (
                <div className="space-y-1 bg-gray-50 p-4 rounded-lg">
                  {document.references.map((ref, idx) => (
                    <p key={idx} className="text-sm text-gray-700">• {ref}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Content Section */}
          <div>
            <h3 className="font-semibold mb-3">Inhoud</h3>
            {editMode ? (
              <Textarea
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                rows={20}
                className="font-mono text-sm"
                data-testid="edit-content-textarea"
              />
            ) : (
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed">{document.content}</pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
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
            <Route path="/document/:id" element={<DocumentDetail />} />
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
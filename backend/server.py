from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import base64
import io
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json
import PyPDF2
from docx import Document as DocxDocument
import tempfile

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection - async for normal operations
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Sync MongoDB client for GridFS operations
sync_client = MongoClient(mongo_url)
sync_db = sync_client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class Document(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    category: str
    file_type: str
    content: str
    tags: List[str] = []
    references: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None
    file_size: Optional[int] = None
    original_filename: Optional[str] = None
    has_original_file: bool = False
    original_filename: Optional[str] = None
    has_original_file: bool = False

class DocumentCreate(BaseModel):
    title: str
    category: str
    file_type: str
    content: str
    tags: List[str] = []
    references: List[str] = []
    file_size: Optional[int] = None

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    references: Optional[List[str]] = None
    content: Optional[str] = None

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ChatRequest(BaseModel):
    session_id: str
    message: str
    context_type: Optional[str] = "general"  # general, consult, treatment, supplement

class TreatmentPlanRequest(BaseModel):
    patient_info: str
    symptoms: str
    diagnosis: str

class SupplementAdviceRequest(BaseModel):
    condition: str
    patient_details: str

# Helper function to extract text from files
async def extract_text_from_file(file: UploadFile) -> str:
    """Extract text from uploaded file"""
    content = await file.read()
    
    if file.filename.endswith('.pdf'):
        # Extract from PDF
        pdf_file = io.BytesIO(content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text
    
    elif file.filename.endswith('.docx'):
        # Extract from DOCX
        with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp_file:
            tmp_file.write(content)
            tmp_file.flush()
            doc = DocxDocument(tmp_file.name)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            os.unlink(tmp_file.name)
        return text
    
    elif file.filename.endswith('.txt'):
        # Extract from TXT
        return content.decode('utf-8')
    
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type")

# Helper function to generate tags with AI
async def generate_tags_with_ai(title: str, content: str) -> List[str]:
    """Generate relevant tags using Claude AI"""
    try:
        session_id = str(uuid.uuid4())
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=session_id,
            system_message="Je bent een expert in het taggen van medische en orthomoleculaire documenten. Genereer 3-7 relevante tags in het Nederlands voor het document."
        ).with_model("anthropic", "claude-4-sonnet-20250514")
        
        prompt = f"""Genereer relevante tags voor dit document:

Titel: {title}
Inhoud: {content[:1000]}...

Geef alleen de tags terug, gescheiden door komma's. Gebruik maximaal 7 tags. Focus op:
- Hoofdonderwerpen
- Supplementen/kruiden die genoemd worden
- Aandoeningen/symptomen
- Therapeutische categorieën

Antwoord alleen met de tags, niets anders."""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse tags from response
        tags = [tag.strip() for tag in response.split(',')]
        return tags[:7]  # Max 7 tags
    except Exception as e:
        logging.error(f"Error generating tags: {str(e)}")
        return ["orthomoleculair", "kennis"]  # Default tags

# Helper function to extract references with AI
async def extract_references_with_ai(content: str) -> List[str]:
    """Extract references/sources from content using Claude AI"""
    try:
        session_id = str(uuid.uuid4())
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=session_id,
            system_message="Je bent een expert in het identificeren van wetenschappelijke referenties en bronnen in medische documenten."
        ).with_model("anthropic", "claude-4-sonnet-20250514")
        
        prompt = f"""Analyseer deze tekst en identificeer alle referenties, bronnen, studies of citaten:

{content[:2000]}...

Geef alleen de gevonden referenties terug, elke referentie op een nieuwe regel.
Als er geen referenties zijn, antwoord dan met: GEEN

Formaat:
- Auteur (jaar) - Titel
- Journal naam, volume, pagina's
- URL indien vermeld

Antwoord alleen met de referenties of GEEN."""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        if response.strip().upper() == "GEEN":
            return []
        
        # Parse references
        references = [ref.strip() for ref in response.split('\n') if ref.strip() and not ref.strip().startswith('-')]
        return references[:10]  # Max 10 references
    except Exception as e:
        logging.error(f"Error extracting references: {str(e)}")
        return []

# Document routes
@api_router.post("/documents", response_model=Document)
async def create_document(doc: DocumentCreate):
    """Upload a new document to the knowledge base"""
    doc_dict = doc.dict()
    doc_obj = Document(**doc_dict)
    await db.documents.insert_one(doc_obj.dict())
    return doc_obj

@api_router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    category: str = Form("artikel")
):
    """Upload a file and extract text with auto-generated tags and references"""
    try:
        # Read file content
        file_content = await file.read()
        
        # Determine file type
        file_type = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'unknown'
        
        # Check if it's an image
        is_image = file_type in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
        is_pdf = file_type == 'pdf'
        
        # For images, store the image (vision/OCR can be added later)
        if is_image:
            doc_title = title if title else file.filename.rsplit('.', 1)[0]
            
            # Simple content for now - just indicate it's an image
            content = f"[Afbeelding: {file.filename}]\n\nDit is een afbeelding. Bekijk het origineel in de document viewer."
            
            # Generate tags based on title/filename
            tags = await generate_tags_with_ai(doc_title, f"Dit is een afbeelding met de naam: {doc_title}")
            references = []
            
            # Store image in GridFS
            import gridfs
            fs = gridfs.GridFS(sync_db)
            
            # Determine media type
            media_type_map = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'webp': 'image/webp',
                'bmp': 'image/bmp'
            }
            media_type = media_type_map.get(file_type, 'image/jpeg')
            
            file_id = fs.put(file_content, filename=file.filename, content_type=media_type)
            
            doc = Document(
                title=doc_title,
                category=category,
                file_type=file_type,
                content=content,
                tags=tags,
                references=references,
                file_size=len(file_content),
                original_filename=file.filename,
                has_original_file=True
            )
            
            doc_dict = doc.dict()
            doc_dict['original_file_id'] = str(file_id)
            
            # Remove MongoDB's _id if present (it's an ObjectId and can't be serialized)
            if '_id' in doc_dict:
                del doc_dict['_id']
            
            await db.documents.insert_one(doc_dict)
            
            return {
                "message": "Afbeelding succesvol geüpload",
                "document": doc_dict
            }
        
        # For PDFs and text files, extract text
        await file.seek(0)  # Reset file pointer
        content = await extract_text_from_file(file)
        
        if not content.strip():
            raise HTTPException(status_code=400, detail="Geen tekst gevonden in bestand")
        
        # Use filename as title if not provided
        doc_title = title if title else file.filename.rsplit('.', 1)[0]
        
        # Generate tags and extract references with AI
        tags = await generate_tags_with_ai(doc_title, content)
        references = await extract_references_with_ai(content)
        
        # Store original file for PDFs
        file_id = None
        has_original = False
        
        if is_pdf:
            import gridfs
            fs = gridfs.GridFS(sync_db)
            file_id = fs.put(file_content, filename=file.filename, content_type=file.content_type or 'application/pdf')
            has_original = True
        
        # Create document
        doc = Document(
            title=doc_title,
            category=category,
            file_type=file_type,
            content=content,
            tags=tags,
            references=references,
            file_size=len(content),
            original_filename=file.filename if has_original else None,
            has_original_file=has_original
        )
        
        doc_dict = doc.dict()
        if file_id:
            doc_dict['original_file_id'] = str(file_id)
        
        # Remove MongoDB's _id if present (it's an ObjectId and can't be serialized)
        if '_id' in doc_dict:
            del doc_dict['_id']
        
        await db.documents.insert_one(doc_dict)
        
        return {
            "message": "Document succesvol geüpload",
            "document": doc_dict
        }
    except Exception as e:
        logging.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/documents/paste")
async def paste_document(
    title: str = Form(...),
    content: str = Form(...),
    category: str = Form("aantekening")
):
    """Create document from pasted text with auto-generated tags and references"""
    try:
        if not content.strip():
            raise HTTPException(status_code=400, detail="Inhoud mag niet leeg zijn")
        
        # Generate tags and extract references with AI
        tags = await generate_tags_with_ai(title, content)
        references = await extract_references_with_ai(content)
        
        # Create document
        doc = Document(
            title=title,
            category=category,
            file_type="text",
            content=content,
            tags=tags,
            references=references,
            file_size=len(content)
        )
        
        await db.documents.insert_one(doc.dict())
        
        return {
            "message": "Document succesvol toegevoegd",
            "document": doc.dict()
        }
    except Exception as e:
        logging.error(f"Paste error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/documents", response_model=List[Document])
async def get_documents(category: Optional[str] = None):
    """Get all documents, optionally filtered by category"""
    query = {}
    if category:
        query["category"] = category
    documents = await db.documents.find(query).sort("created_at", -1).to_list(1000)
    return [Document(**doc) for doc in documents]

@api_router.get("/documents/{document_id}", response_model=Document)
async def get_document(document_id: str):
    """Get a specific document by ID"""
    doc = await db.documents.find_one({"id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return Document(**doc)

@api_router.get("/documents/{document_id}/file")
async def get_original_file(document_id: str):
    """Get the original uploaded file"""
    doc = await db.documents.find_one({"id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not doc.get('has_original_file') or not doc.get('original_file_id'):
        raise HTTPException(status_code=404, detail="Origineel bestand niet beschikbaar")
    
    try:
        import gridfs
        from bson import ObjectId
        
        fs = gridfs.GridFS(sync_db)
        file_id = ObjectId(doc['original_file_id'])
        grid_out = fs.get(file_id)
        
        # Determine media type based on file extension
        file_type = doc.get('file_type', '').lower()
        media_types = {
            'pdf': 'application/pdf',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'bmp': 'image/bmp',
            'webp': 'image/webp'
        }
        
        media_type = media_types.get(file_type, 'application/octet-stream')
        
        return StreamingResponse(
            io.BytesIO(grid_out.read()),
            media_type=media_type,
            headers={
                "Content-Disposition": f"inline; filename={doc.get('original_filename', 'document')}"
            }
        )
    except Exception as e:
        logging.error(f"Error retrieving file: {str(e)}")
        raise HTTPException(status_code=500, detail="Fout bij ophalen bestand")

@api_router.put("/documents/{document_id}")
async def update_document(document_id: str, update: DocumentUpdate):
    """Update a document"""
    doc = await db.documents.find_one({"id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    update_data = update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.documents.update_one(
        {"id": document_id},
        {"$set": update_data}
    )
    
    updated_doc = await db.documents.find_one({"id": document_id})
    return {"message": "Document bijgewerkt", "document": Document(**updated_doc).dict()}

@api_router.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    """Delete a document"""
    result = await db.documents.delete_one({"id": document_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted successfully"}

@api_router.get("/documents/search/{query}")
async def search_documents(query: str):
    """Search documents by title, content, or tags"""
    documents = await db.documents.find({
        "$or": [
            {"title": {"$regex": query, "$options": "i"}},
            {"content": {"$regex": query, "$options": "i"}},
            {"tags": {"$regex": query, "$options": "i"}}
        ]
    }).to_list(100)
    return [Document(**doc) for doc in documents]

# Category routes
@api_router.post("/categories", response_model=Category)
async def create_category(cat: CategoryCreate):
    """Create a new custom category"""
    # Check if category already exists
    existing = await db.categories.find_one({"name": cat.name})
    if existing:
        raise HTTPException(status_code=400, detail="Categorie bestaat al")
    
    category = Category(**cat.dict())
    await db.categories.insert_one(category.dict())
    return category

@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    """Get all categories"""
    categories = await db.categories.find().sort("name", 1).to_list(100)
    return [Category(**cat) for cat in categories]

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    """Delete a category"""
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}

# Chat routes with Claude integration
@api_router.post("/chat")
async def chat(request: ChatRequest):
    """Chat with AI assistant using Claude Sonnet 4"""
    try:
        # Save user message
        user_msg = ChatMessage(
            session_id=request.session_id,
            role="user",
            content=request.message
        )
        await db.chat_messages.insert_one(user_msg.dict())
        
        # Get relevant documents for context
        relevant_docs = await db.documents.find({
            "$or": [
                {"content": {"$regex": request.message.split()[0] if request.message.split() else "", "$options": "i"}},
                {"tags": {"$regex": request.message.split()[0] if request.message.split() else "", "$options": "i"}}
            ]
        }).limit(3).to_list(3)
        
        context = ""
        if relevant_docs:
            context = "\n\nRelevante documenten uit de kennisbank:\n"
            for doc in relevant_docs:
                context += f"- {doc['title']}: {doc['content'][:200]}...\n"
        
        # Create system message based on context type
        system_messages = {
            "general": "Je bent een expert orthomoleculair natuurgeneeskundige en kPNI therapeut. Je helpt met het beantwoorden van vragen op basis van beschikbare kennis over supplementen, kruiden, diagnostiek en behandelplannen.",
            "consult": "Je bent een consult-assistent voor een orthomoleculair natuurgeneeskundige praktijk. Help bij het analyseren van patiëntsymptomen en adviseer over mogelijke diagnostiek.",
            "treatment": "Je bent gespecialiseerd in het maken van behandelplannen voor orthomoleculaire therapie en kPNI. Geef concrete en praktische behandeladvies.",
            "supplement": "Je bent expert in supplementen, kruiden en gemmo therapie. Geef gedetailleerde adviezen over dosering en combinaties."
        }
        
        system_message = system_messages.get(request.context_type, system_messages["general"])
        
        # Initialize Claude chat
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=request.session_id,
            system_message=system_message
        ).with_model("anthropic", "claude-4-sonnet-20250514")
        
        # Send message with context
        user_message = UserMessage(
            text=request.message + context
        )
        
        response = await chat.send_message(user_message)
        
        # Save assistant message
        assistant_msg = ChatMessage(
            session_id=request.session_id,
            role="assistant",
            content=response
        )
        await db.chat_messages.insert_one(assistant_msg.dict())
        
        return {
            "response": response,
            "session_id": request.session_id
        }
    except Exception as e:
        logging.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    """Get chat history for a session"""
    messages = await db.chat_messages.find(
        {"session_id": session_id}
    ).sort("timestamp", 1).to_list(1000)
    return [ChatMessage(**msg) for msg in messages]

# Treatment plan generation
@api_router.post("/treatment-plan")
async def generate_treatment_plan(request: TreatmentPlanRequest):
    """Generate a treatment plan using AI"""
    try:
        session_id = str(uuid.uuid4())
        
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=session_id,
            system_message="Je bent een expert orthomoleculair therapeut gespecialiseerd in kPNI. Maak gedetailleerde behandelplannen met specifieke aanbevelingen voor supplementen, kruiden, leefstijl en aanvullende diagnostiek."
        ).with_model("anthropic", "claude-4-sonnet-20250514")
        
        prompt = f"""Maak een uitgebreid behandelplan voor de volgende patiënt:

Patiënt informatie: {request.patient_info}
Symptomen: {request.symptoms}
Diagnose: {request.diagnosis}

Geef een gestructureerd behandelplan met:
1. Orthomoleculaire supplementen (met dosering)
2. Kruidenadvies
3. Gemmo therapie suggesties
4. Leefstijladviezen
5. Aanvullende diagnostiek indien nodig
6. Tijdslijn en evaluatiemomenten"""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {"treatment_plan": response}
    except Exception as e:
        logging.error(f"Treatment plan error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Supplement advice
@api_router.post("/supplement-advice")
async def get_supplement_advice(request: SupplementAdviceRequest):
    """Get supplement and herb advice using AI"""
    try:
        session_id = str(uuid.uuid4())
        
        # Get relevant supplement documents
        relevant_docs = await db.documents.find({
            "$or": [
                {"category": "supplement"},
                {"category": "kruiden"},
                {"tags": {"$in": ["supplement", "kruiden", "gemmo"]}}
            ]
        }).limit(5).to_list(5)
        
        context = ""
        if relevant_docs:
            context = "\n\nRelevante informatie uit kennisbank:\n"
            for doc in relevant_docs:
                context += f"- {doc['title']}: {doc['content'][:300]}...\n"
        
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=session_id,
            system_message="Je bent expert in orthomoleculaire supplementen, kruiden en gemmo therapie. Geef praktische en evidence-based adviezen."
        ).with_model("anthropic", "claude-4-sonnet-20250514")
        
        prompt = f"""Geef supplement- en kruidenadvies voor:

Conditie: {request.condition}
Patiënt details: {request.patient_details}

Geef advies over:
1. Aanbevolen supplementen met dosering
2. Kruidenpreparaten
3. Gemmo therapie
4. Combinatie-adviezen
5. Contra-indicaties
6. Interacties met andere middelen

{context}"""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {"advice": response}
    except Exception as e:
        logging.error(f"Supplement advice error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Statistics
@api_router.get("/stats")
async def get_stats():
    """Get knowledge base statistics"""
    total_docs = await db.documents.count_documents({})
    categories = await db.documents.distinct("category")
    
    category_counts = {}
    for cat in categories:
        count = await db.documents.count_documents({"category": cat})
        category_counts[cat] = count
    
    return {
        "total_documents": total_docs,
        "categories": category_counts
    }

@api_router.get("/")
async def root():
    return {"message": "Wellness Knowledge Archive API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
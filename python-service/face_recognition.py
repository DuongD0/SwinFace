"""
Face recognition module using FaceNet for student identification
"""
import os
import numpy as np
from pathlib import Path
from typing import List, Tuple, Optional, Dict
import cv2
from facenet_pytorch import MTCNN, InceptionResnetV1
import torch
from PIL import Image

from config import settings

class FaceRecognizer:
    """Face recognition system using FaceNet embeddings"""
    
    def __init__(self):
        """Initialize face recognition models"""
        self.device = torch.device(settings.device if torch.cuda.is_available() else 'cpu')
        
        # Initialize MTCNN for face detection and alignment
        self.mtcnn = MTCNN(
            image_size=160,
            margin=0,
            min_face_size=20,
            thresholds=[0.6, 0.7, 0.7],
            factor=0.709,
            post_process=True,
            device=self.device
        )
        
        # Initialize InceptionResnetV1 for face embedding
        self.resnet = InceptionResnetV1(pretrained='vggface2').eval().to(self.device)
        
        print(f"Face recognition initialized on device: {self.device}")
    
    def extract_face_embedding(self, image: np.ndarray) -> Optional[np.ndarray]:
        """
        Extract face embedding from an image
        
        Args:
            image: Input image (BGR format from OpenCV)
            
        Returns:
            Face embedding vector or None if no face detected
        """
        try:
            # Convert BGR to RGB
            if len(image.shape) == 2:
                image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
            elif image.shape[2] == 3:
                image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Convert to PIL Image
            pil_image = Image.fromarray(image)
            
            # Detect and align face
            face_tensor = self.mtcnn(pil_image)
            
            if face_tensor is None:
                return None
            
            # Get embedding
            with torch.no_grad():
                face_tensor = face_tensor.unsqueeze(0).to(self.device)
                embedding = self.resnet(face_tensor).cpu().numpy().flatten()
            
            return embedding
        
        except Exception as e:
            print(f"Error extracting face embedding: {e}")
            return None
    
    def extract_face_from_bbox(self, frame: np.ndarray, bbox: Tuple[int, int, int, int]) -> Optional[np.ndarray]:
        """
        Extract face crop from bounding box
        
        Args:
            frame: Full video frame
            bbox: Bounding box (x1, y1, x2, y2)
            
        Returns:
            Cropped face image or None
        """
        try:
            x1, y1, x2, y2 = bbox
            
            # Ensure coordinates are within frame bounds
            h, w = frame.shape[:2]
            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(w, x2)
            y2 = min(h, y2)
            
            # Extract face crop
            face_crop = frame[y1:y2, x1:x2]
            
            if face_crop.size == 0:
                return None
            
            return face_crop
        
        except Exception as e:
            print(f"Error extracting face from bbox: {e}")
            return None
    
    def compare_embeddings(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """
        Compare two face embeddings using cosine similarity
        
        Args:
            embedding1: First face embedding
            embedding2: Second face embedding
            
        Returns:
            Similarity score (0-1, higher is more similar)
        """
        # Calculate cosine similarity
        dot_product = np.dot(embedding1, embedding2)
        norm1 = np.linalg.norm(embedding1)
        norm2 = np.linalg.norm(embedding2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        similarity = dot_product / (norm1 * norm2)
        
        # Convert to 0-1 range (cosine similarity is -1 to 1)
        similarity = (similarity + 1) / 2
        
        return float(similarity)
    
    def match_face(
        self, 
        face_embedding: np.ndarray, 
        known_embeddings: Dict[int, List[np.ndarray]]
    ) -> Tuple[Optional[int], float]:
        """
        Match a face embedding against known student embeddings
        
        Args:
            face_embedding: Embedding to match
            known_embeddings: Dictionary of student_id -> list of embeddings
            
        Returns:
            Tuple of (matched_student_id, confidence) or (None, 0.0)
        """
        best_match_id = None
        best_similarity = 0.0
        
        for student_id, embeddings_list in known_embeddings.items():
            for known_embedding in embeddings_list:
                similarity = self.compare_embeddings(face_embedding, known_embedding)
                
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_match_id = student_id
        
        # Only return match if above threshold
        if best_similarity >= settings.face_recognition_threshold:
            return best_match_id, best_similarity
        
        return None, best_similarity
    
    def load_known_faces(self, known_faces_dir: Path) -> Dict[str, List[np.ndarray]]:
        """
        Load known faces from directory structure:
        known_faces/
            StudentName1/
                1.jpg
                2.jpg
            StudentName2/
                1.jpg
        
        Args:
            known_faces_dir: Directory containing student face folders
            
        Returns:
            Dictionary mapping student name to list of embeddings
        """
        known_faces = {}
        
        if not known_faces_dir.exists():
            print(f"Known faces directory not found: {known_faces_dir}")
            return known_faces
        
        for student_folder in known_faces_dir.iterdir():
            if not student_folder.is_dir():
                continue
            
            student_name = student_folder.name
            embeddings = []
            
            for image_path in student_folder.glob("*"):
                if image_path.suffix.lower() not in ['.jpg', '.jpeg', '.png']:
                    continue
                
                # Read image
                image = cv2.imread(str(image_path))
                if image is None:
                    continue
                
                # Extract embedding
                embedding = self.extract_face_embedding(image)
                if embedding is not None:
                    embeddings.append(embedding)
            
            if embeddings:
                known_faces[student_name] = embeddings
                print(f"Loaded {len(embeddings)} face(s) for {student_name}")
        
        print(f"Total students with registered faces: {len(known_faces)}")
        return known_faces
    
    def register_student_face(
        self, 
        student_name: str, 
        image_path: str, 
        known_faces_dir: Path
    ) -> Optional[np.ndarray]:
        """
        Register a new student face
        
        Args:
            student_name: Name of the student
            image_path: Path to the student's face image
            known_faces_dir: Directory to save the face
            
        Returns:
            Face embedding or None if failed
        """
        try:
            # Create student directory
            student_dir = known_faces_dir / student_name
            student_dir.mkdir(parents=True, exist_ok=True)
            
            # Read image
            image = cv2.imread(image_path)
            if image is None:
                print(f"Failed to read image: {image_path}")
                return None
            
            # Extract embedding
            embedding = self.extract_face_embedding(image)
            if embedding is None:
                print(f"No face detected in image: {image_path}")
                return None
            
            # Copy image to student directory
            image_files = list(student_dir.glob("*.jpg"))
            next_number = len(image_files) + 1
            new_image_path = student_dir / f"{next_number}.jpg"
            
            cv2.imwrite(str(new_image_path), image)
            print(f"Registered face for {student_name}: {new_image_path}")
            
            return embedding
        
        except Exception as e:
            print(f"Error registering student face: {e}")
            return None


"""
Video processing module for face tracking and motion analysis
Refactored from FaceMotion main.py with face recognition integration
"""
import os
from collections import defaultdict, deque
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import cv2
import numpy as np
from ultralytics import YOLO
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import plotly.graph_objects as go

from config import settings
from face_recognition import FaceRecognizer

class VideoProcessor:
    """Video processor for face tracking and motion analysis"""
    
    def __init__(self, yolo_model_path: str, output_dir: Path):
        """
        Initialize video processor
        
        Args:
            yolo_model_path: Path to YOLO model file
            output_dir: Directory to save outputs
        """
        self.model = YOLO(yolo_model_path).to(settings.device)
        self.output_dir = output_dir
        self.face_recognizer = FaceRecognizer()
        
        # Motion analysis parameters
        self.max_history = settings.max_history
        self.ema_alpha = settings.ema_alpha
        self.movement_threshold = settings.movement_threshold
        
        print(f"Video processor initialized with model: {yolo_model_path}")
    
    def process_video(
        self,
        video_path: str,
        session_id: int,
        known_student_embeddings: Optional[Dict[int, List[np.ndarray]]] = None,
        progress_callback: Optional[callable] = None
    ) -> Dict:
        """
        Process video for face detection, tracking, and motion analysis
        
        Args:
            video_path: Path to input video
            session_id: Session ID for organizing outputs
            known_student_embeddings: Dict of student_id -> list of face embeddings
            progress_callback: Optional callback function(progress: int) for progress updates
            
        Returns:
            Dictionary with processing results
        """
        # Create session output directory
        session_output_dir = self.output_dir / str(session_id)
        session_output_dir.mkdir(parents=True, exist_ok=True)
        
        # Open video
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Failed to open video: {video_path}")
        
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Setup output video
        output_video_path = session_output_dir / "processed_video.mp4"
        fourcc = cv2.VideoWriter_fourcc(*'avc1')
        out = cv2.VideoWriter(str(output_video_path), fourcc, fps, (width, height))
        
        # Initialize tracking data structures
        track_history = defaultdict(lambda: deque(maxlen=self.max_history))
        motion_log = defaultdict(list)
        ema_state = {}
        prev_positions = {}
        track_to_student = {}  # Map track_id to student_id
        track_embeddings = {}  # Store embeddings for each track
        
        frame_idx = 0
        
        print(f"Processing video: {video_path}")
        print(f"Total frames: {total_frames}, FPS: {fps}")
        
        # Process each frame
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break
            
            # Run YOLO tracking
            result = self.model.track(frame, persist=True, verbose=False)[0]
            
            if result.boxes and result.boxes.is_track:
                boxes = result.boxes.xywh.cpu().numpy()
                track_ids = result.boxes.id.int().cpu().tolist()
                
                for box, track_id in zip(boxes, track_ids):
                    x, y, w, h = box
                    track = track_history[track_id]
                    track.append((float(x), float(y)))
                    
                    # Calculate movement
                    if track_id in prev_positions:
                        px, py = prev_positions[track_id]
                        dx, dy = float(x) - px, float(y) - py
                        movement = np.sqrt(dx ** 2 + dy ** 2)
                    else:
                        movement = 0.0
                    
                    prev_positions[track_id] = (float(x), float(y))
                    
                    # Calculate EMA
                    prev_ema = ema_state.get(track_id, 0.0)
                    curr_ema = self.ema_alpha * movement + (1 - self.ema_alpha) * prev_ema
                    ema_state[track_id] = curr_ema
                    
                    # Determine activity level
                    if curr_ema > self.movement_threshold:
                        level = "Active"
                        box_color = (0, 255, 0)  # Green
                        text_color = (0, 0, 0)  # Black
                    else:
                        level = "Inactive"
                        box_color = (0, 0, 255)  # Red
                        text_color = (255, 255, 255)  # White
                    
                    # Face recognition (attempt every 30 frames for efficiency)
                    student_id = track_to_student.get(track_id)
                    if student_id is None and known_student_embeddings and frame_idx % 30 == 0:
                        # Extract face for recognition
                        x1, y1 = int(x - w / 2), int(y - h / 2)
                        x2, y2 = int(x + w / 2), int(y + h / 2)
                        face_crop = self.face_recognizer.extract_face_from_bbox(frame, (x1, y1, x2, y2))
                        
                        if face_crop is not None:
                            face_embedding = self.face_recognizer.extract_face_embedding(face_crop)
                            if face_embedding is not None:
                                matched_id, confidence = self.face_recognizer.match_face(
                                    face_embedding, 
                                    known_student_embeddings
                                )
                                if matched_id is not None:
                                    track_to_student[track_id] = matched_id
                                    student_id = matched_id
                                    print(f"Track {track_id} matched to student {student_id} (confidence: {confidence:.2f})")
                    
                    # Log motion data
                    motion_log[track_id].append({
                        'frame': frame_idx,
                        'movement': movement,
                        'ema': curr_ema,
                        'activity_level': level,
                        'student_id': student_id
                    })
                    
                    # Draw bounding box
                    x1, y1 = int(x - w / 2), int(y - h / 2)
                    x2, y2 = int(x + w / 2), int(y + h / 2)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
                    
                    # Draw label with student ID if recognized
                    if student_id is not None:
                        label = f"ID:{student_id} - {level}"
                    else:
                        label = f"Track:{track_id} - {level}"
                    
                    label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
                    cv2.rectangle(frame, (x1, y1 - label_size[1] - 10), 
                                 (x1 + label_size[0], y1), box_color, -1)
                    cv2.putText(frame, label, (x1, y1 - 5), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, text_color, 2)
                    
                    # Draw tracking lines
                    if len(track) > 1:
                        points = np.array(track, dtype=np.int32).reshape((-1, 1, 2))
                        cv2.polylines(frame, [points], isClosed=False, color=(255, 0, 0), thickness=2)
            
            # Write frame
            out.write(frame)
            frame_idx += 1
            
            # Update progress
            if progress_callback and frame_idx % 30 == 0:
                progress = int((frame_idx / total_frames) * 100)
                progress_callback(progress)
        
        # Cleanup
        cap.release()
        out.release()
        
        print(f"Video processing complete. Processed {frame_idx} frames.")
        
        # Generate analytics
        analytics_results = self._generate_analytics(
            motion_log, 
            session_output_dir,
            track_to_student
        )
        
        # Compile results
        results = {
            'session_id': session_id,
            'total_frames': frame_idx,
            'output_video_path': str(output_video_path),
            'motion_data': motion_log,
            'track_to_student': track_to_student,
            'analytics': analytics_results
        }
        
        return results
    
    def _generate_analytics(
        self,
        motion_log: Dict,
        output_dir: Path,
        track_to_student: Dict
    ) -> Dict:
        """Generate motion analytics and visualizations"""
        
        # Convert motion log to DataFrame
        records = []
        for track_id, log_entries in motion_log.items():
            student_id = track_to_student.get(track_id)
            for entry in log_entries:
                records.append({
                    'frame': entry['frame'],
                    'track_id': track_id,
                    'student_id': student_id,
                    'movement': entry['movement'],
                    'ema': entry['ema'],
                    'activity_level': entry['activity_level']
                })
        
        if not records:
            return {}
        
        df = pd.DataFrame(records)
        
        # Save CSV
        csv_path = output_dir / "motion_activity.csv"
        df.to_csv(csv_path, index=False)
        
        # Generate plots
        plots = {}
        
        # 1. Rolling Mean Plot
        rolling_plot_path = output_dir / "motion_plot_rolling.png"
        self._plot_rolling_mean(df, rolling_plot_path)
        plots['rolling_plot'] = str(rolling_plot_path)
        
        # 2. EMA Plot
        ema_plot_path = output_dir / "motion_plot_ema.png"
        self._plot_ema(df, ema_plot_path)
        plots['ema_plot'] = str(ema_plot_path)
        
        # 3. Activity Index
        index_plot_path = output_dir / "activity_index.png"
        activity_summary = self._plot_activity_index(df, index_plot_path)
        plots['index_plot'] = str(index_plot_path)
        
        # 4. Interactive Plot
        interactive_path = output_dir / "interactive_motion_comparison.html"
        self._plot_interactive(df, interactive_path)
        plots['interactive_plot'] = str(interactive_path)
        
        return {
            'csv_path': str(csv_path),
            'plots': plots,
            'activity_summary': activity_summary
        }
    
    def _plot_rolling_mean(self, df: pd.DataFrame, output_path: Path):
        """Generate rolling mean plot"""
        plt.figure(figsize=(12, 6))
        
        for track_id in df['track_id'].unique():
            df_track = df[df['track_id'] == track_id].sort_values('frame')
            label = f"Track ID {track_id}"
            if df_track['student_id'].notna().any():
                student_id = df_track['student_id'].dropna().iloc[0]
                label = f"Student {student_id}"
            
            plt.plot(df_track['frame'], 
                    df_track['movement'].rolling(5, min_periods=1).mean(),
                    label=label, linewidth=2)
        
        plt.axhline(df['movement'].mean(), color='red', linestyle='--',
                   label='Average Movement', linewidth=2)
        plt.title('Movement Activity Over Time (Rolling Average)', fontsize=14)
        plt.xlabel('Frame', fontsize=12)
        plt.ylabel('Movement (pixels)', fontsize=12)
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        plt.close()
    
    def _plot_ema(self, df: pd.DataFrame, output_path: Path):
        """Generate EMA plot"""
        plt.figure(figsize=(12, 6))
        
        for track_id in df['track_id'].unique():
            df_track = df[df['track_id'] == track_id].sort_values('frame')
            label = f"Track ID {track_id}"
            if df_track['student_id'].notna().any():
                student_id = df_track['student_id'].dropna().iloc[0]
                label = f"Student {student_id}"
            
            plt.plot(df_track['frame'], df_track['ema'], 
                    label=label, linewidth=2)
        
        plt.axhline(df['ema'].mean(), color='red', linestyle='--',
                   label='Average EMA', linewidth=2)
        plt.title('Movement Activity Over Time (EMA Smoothed)', fontsize=14)
        plt.xlabel('Frame', fontsize=12)
        plt.ylabel('EMA Value', fontsize=12)
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        plt.close()
    
    def _plot_activity_index(self, df: pd.DataFrame, output_path: Path) -> List[Dict]:
        """Generate activity index bar chart"""
        activity_df = df.groupby('track_id').agg({
            'ema': 'mean',
            'student_id': 'first'
        }).reset_index()
        activity_df.rename(columns={'ema': 'activity_index'}, inplace=True)
        activity_df = activity_df.sort_values('activity_index', ascending=False)
        
        # Assign colors
        colors = []
        labels = []
        for _, row in activity_df.iterrows():
            if row['activity_index'] > self.movement_threshold:
                colors.append('green')
            else:
                colors.append('red')
            
            if pd.notna(row['student_id']):
                labels.append(f"Student {int(row['student_id'])}")
            else:
                labels.append(f"Track {int(row['track_id'])}")
        
        plt.figure(figsize=(12, 6))
        bars = plt.bar(labels, activity_df['activity_index'], color=colors)
        
        plt.title('Activity Index per Track/Student (EMA)', fontsize=14)
        plt.xlabel('Track/Student ID', fontsize=12)
        plt.ylabel('Activity Index', fontsize=12)
        plt.grid(axis='y', alpha=0.3)
        plt.xticks(rotation=45, ha='right')
        
        # Add threshold line
        plt.axhline(y=self.movement_threshold, color='black', linestyle='--',
                   label=f'Activity Threshold ({self.movement_threshold})', linewidth=2)
        
        # Add value labels
        for bar in bars:
            yval = bar.get_height()
            plt.text(bar.get_x() + bar.get_width()/2, yval + 0.1,
                    f'{yval:.2f}', ha='center', va='bottom', fontweight='bold')
        
        # Legend
        legend_handles = [
            mpatches.Patch(color='green', label='Active (> threshold)'),
            mpatches.Patch(color='red', label='Inactive (≤ threshold)'),
        ]
        plt.legend(handles=legend_handles, loc='upper right')
        plt.tight_layout()
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        # Return summary
        summary = []
        for _, row in activity_df.iterrows():
            summary.append({
                'track_id': int(row['track_id']),
                'student_id': int(row['student_id']) if pd.notna(row['student_id']) else None,
                'activity_index': float(row['activity_index']),
                'status': 'Active' if row['activity_index'] > self.movement_threshold else 'Inactive'
            })
        
        return summary
    
    def _plot_interactive(self, df: pd.DataFrame, output_path: Path):
        """Generate interactive Plotly visualization"""
        fig = go.Figure()
        
        for track_id in df['track_id'].unique():
            df_track = df[df['track_id'] == track_id].sort_values('frame')
            label = f"Track ID {track_id}"
            if df_track['student_id'].notna().any():
                student_id = df_track['student_id'].dropna().iloc[0]
                label = f"Student {student_id}"
            
            # Rolling average trace
            fig.add_trace(go.Scatter(
                x=df_track['frame'],
                y=df_track['movement'].rolling(5, min_periods=1).mean(),
                mode='lines',
                name=f'{label} (Rolling)',
                line=dict(dash='dash', width=2)
            ))
            
            # EMA trace
            fig.add_trace(go.Scatter(
                x=df_track['frame'],
                y=df_track['ema'],
                mode='lines',
                name=f'{label} (EMA)',
                line=dict(dash='solid', width=2)
            ))
        
        fig.update_layout(
            title='Interactive Movement Analysis: EMA vs Rolling Average',
            xaxis_title='Frame',
            yaxis_title='Movement',
            template='plotly_white',
            hovermode='x unified'
        )
        fig.write_html(str(output_path))


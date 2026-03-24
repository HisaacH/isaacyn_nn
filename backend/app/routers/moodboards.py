from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import MoodboardTemplate, User
from app.schemas import MoodboardGalleryItem, MoodboardTemplateCreate, MoodboardTemplatePublic, MoodboardTemplateUpdate

router = APIRouter(tags=["moodboards"])


def apply_template_payload(
    template: MoodboardTemplate,
    payload: MoodboardTemplateCreate | MoodboardTemplateUpdate,
) -> MoodboardTemplate:
    template.name = payload.name.strip()
    template.group_name = payload.group_name.strip() or "默认分组"
    template.board_title = payload.board_title
    template.board_note = payload.board_note
    template.canvas_width = payload.canvas_width
    template.canvas_height = payload.canvas_height
    template.background_color = payload.background_color
    template.preview_image = payload.preview_image
    template.board_items = payload.board_items
    template.doodles = payload.doodles
    return template


@router.get("/api/moodboards/gallery", response_model=list[MoodboardGalleryItem])
def list_gallery_items(db: Session = Depends(get_db)) -> list[MoodboardTemplate]:
    return (
        db.query(MoodboardTemplate)
        .filter(MoodboardTemplate.preview_image.is_not(None))
        .order_by(desc(MoodboardTemplate.updated_at), desc(MoodboardTemplate.id))
        .all()
    )


@router.get("/api/admin/moodboards/templates", response_model=list[MoodboardTemplatePublic])
def list_templates(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> list[MoodboardTemplate]:
    return db.query(MoodboardTemplate).order_by(desc(MoodboardTemplate.updated_at), desc(MoodboardTemplate.id)).all()


@router.get("/api/admin/moodboards/templates/{template_id}", response_model=MoodboardTemplatePublic)
def get_template(template_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)) -> MoodboardTemplate:
    template = db.get(MoodboardTemplate, template_id)
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return template


@router.post("/api/admin/moodboards/templates", response_model=MoodboardTemplatePublic, status_code=status.HTTP_201_CREATED)
def create_template(
    payload: MoodboardTemplateCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MoodboardTemplate:
    template = apply_template_payload(MoodboardTemplate(), payload)
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.put("/api/admin/moodboards/templates/{template_id}", response_model=MoodboardTemplatePublic)
def update_template(
    template_id: int,
    payload: MoodboardTemplateUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MoodboardTemplate:
    template = db.get(MoodboardTemplate, template_id)
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    apply_template_payload(template, payload)
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.delete("/api/admin/moodboards/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(template_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)) -> None:
    template = db.get(MoodboardTemplate, template_id)
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    db.delete(template)
    db.commit()

#!/usr/bin/env python3
"""
Script de fine-tuning local TrOCR pour Makhtout.

Ce script :
1. Se connecte à la base PostgreSQL
2. Récupère les corrections validées par l'admin
3. Génère un dataset image/texte
4. Fine-tune TrOCR avec LoRA (CPU/GPU)

Usage:
    python finetune_trocr.py --epochs 5 --batch-size 2 --output-dir ./models/trocr-makhtout
"""

import argparse
import os
from datetime import datetime
from typing import List, Tuple

import psycopg2
from PIL import Image
from datasets import Dataset
from transformers import (
    TrOCRProcessor,
    VisionEncoderDecoderModel,
    Seq2SeqTrainingArguments,
    Seq2SeqTrainer,
    default_data_collator,
)


def load_validated_corrections(database_url: str) -> List[Tuple[str, str, str]]:
    """Charge les corrections validées depuis PostgreSQL.
    
    Retourne une liste de tuples (image_path, original_text, corrected_text).
    """
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    cur.execute(
        """
        SELECT c.original_value, c.corrected_value, d.storage_path
        FROM corrections c
        JOIN transcriptions t ON c.transcription_id = t.id
        JOIN documents d ON t.document_id = d.id
        WHERE c.is_validated_by_admin = TRUE
        ORDER BY c.created_at DESC
        """
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


def build_dataset(corrections: List[Tuple[str, str, str]], minio_endpoint: str, bucket: str):
    """Construit un dataset Hugging Face à partir des corrections."""
    data = []
    for original, corrected, storage_path in corrections:
        # Dans un déploiement réel, on télécharge l'image depuis MinIO
        # Ici on suppose que les images sont accessibles localement
        image_path = os.path.join("/app/models/documents", storage_path)
        if os.path.exists(image_path):
            data.append({
                "image_path": image_path,
                "text": corrected,
            })
    return Dataset.from_list(data)


def preprocess_data(examples, processor):
    """Prétraite les images et les textes pour TrOCR."""
    images = [Image.open(path).convert("RGB") for path in examples["image_path"]
              if os.path.exists(path)]
    texts = [text for text, path in zip(examples["text"], examples["image_path"])
             if os.path.exists(path)]

    pixel_values = processor(images, return_tensors="pt").pixel_values
    labels = processor.tokenizer(
        texts,
        padding="max_length",
        max_length=128,
        return_tensors="pt",
    ).input_ids

    labels[labels == processor.tokenizer.pad_token_id] = -100

    return {
        "pixel_values": pixel_values,
        "labels": labels,
    }


def main():
    parser = argparse.ArgumentParser(description="Fine-tune TrOCR on validated corrections")
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL"), help="PostgreSQL URL")
    parser.add_argument("--epochs", type=int, default=5, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=2, help="Training batch size")
    parser.add_argument("--output-dir", default="./models/trocr-makhtout", help="Output directory")
    parser.add_argument("--base-model", default="microsoft/trocr-base-handwritten", help="Base TrOCR model")
    args = parser.parse_args()

    if not args.database_url:
        raise ValueError("DATABASE_URL is required")

    print(f"[{datetime.now()}] Loading validated corrections...")
    corrections = load_validated_corrections(args.database_url)
    print(f"[{datetime.now()}] Found {len(corrections)} validated corrections")

    if len(corrections) < 10:
        print("Not enough validated corrections to train. Need at least 10.")
        return

    print(f"[{datetime.now()}] Building dataset...")
    dataset = build_dataset(corrections, "", "documents")

    print(f"[{datetime.now()}] Loading processor and model...")
    processor = TrOCRProcessor.from_pretrained(args.base_model)
    model = VisionEncoderDecoderModel.from_pretrained(args.base_model)

    # Configuration du modèle
    model.config.decoder_start_token_id = processor.tokenizer.cls_token_id
    model.config.pad_token_id = processor.tokenizer.pad_token_id
    model.config.vocab_size = model.config.decoder.vocab_size

    print(f"[{datetime.now()}] Preprocessing dataset...")
    processed_dataset = dataset.map(
        lambda examples: preprocess_data(examples, processor),
        batched=True,
        remove_columns=dataset.column_names,
    )

    training_args = Seq2SeqTrainingArguments(
        output_dir=args.output_dir,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        learning_rate=5e-5,
        logging_steps=10,
        save_strategy="epoch",
        fp16=False,
        report_to="none",
    )

    trainer = Seq2SeqTrainer(
        model=model,
        args=training_args,
        train_dataset=processed_dataset,
        data_collator=default_data_collator,
    )

    print(f"[{datetime.now()}] Starting training...")
    trainer.train()

    print(f"[{datetime.now()}] Saving model to {args.output_dir}")
    model.save_pretrained(args.output_dir)
    processor.save_pretrained(args.output_dir)

    print(f"[{datetime.now()}] Fine-tuning complete!")


if __name__ == "__main__":
    main()

# Offline Asset Checklist PWA

A production-style offline-first checklist application built with React, TypeScript and IndexedDB (Dexie).

🇧🇷 Versão em português abaixo.

---

# 🇺🇸 English Version

## Overview

Offline Asset Checklist PWA is a portfolio project designed to simulate a real-world operational checklist system with:

- Offline-first architecture
- Role-based access control
- Local persistence using IndexedDB
- Versioned data schema
- Import / Export capabilities
- Admin dashboard with filtering and analytics

The project was intentionally structured to resemble a scalable SaaS product, even without a backend.

---

## Why This Project Exists

This project was built as part of a strategic transition into software development.

Instead of creating a simple CRUD application, the goal was to design something that demonstrates:

- Architectural thinking
- Strong typing with TypeScript
- Separation of domain and UI logic
- Real-world offline data handling
- Clean state management
- Maintainable structure

It represents a shift from “student projects” to product-oriented engineering.

---

## Core Features

- 🔐 Role-based access (Admin / Operator)
- 📱 Offline-first (no backend required)
- 💾 IndexedDB persistence using Dexie
- 📊 Admin dashboard with:
  - Filters (asset, user, mode, date range)
  - Totals per asset
  - Issue detection
- 📤 Export:
  - JSON (backup)
  - CSV summary
  - CSV detailed
- 📥 Import JSON backups (deduplicated)
- 📋 Dynamic checklist templates by asset model
- 🧠 Issue detection logic centralized in domain layer

---

## Tech Stack

- React
- TypeScript
- Vite
- Dexie (IndexedDB)
- PWA (Service Worker)
- CSS variables (dark UI theme)

---

## Architecture Highlights

### 1. Strong Domain Modeling

Core types:

- `ChecklistRecord`
- `ChecklistAnswer`
- `OperationMode`
- `Role`
- `ChecklistTemplate`

Business rules (like issue detection) live in:
src/utils/checklist.ts

---

### 2. Offline-First Strategy

- All data stored in IndexedDB
- No network dependency
- Schema versioned using Dexie
- Service Worker enabled for PWA behavior

---

### 3. Folder Structure
src/
├── checklists/ → template definitions
├── components/ → UI components
├── demo/ → demo asset catalog
├── domain/ → domain logic (roles, ids, session)
├── pages/ → app screens
├── utils/ → business rules
├── db.ts → IndexedDB schema
├── auth.ts → session handling
└── App.tsx


---

## Running the Project

Install dependencies:
npm install


Run in development:
npm run dev


Build production version:
npm run build


Preview production build (recommended for PWA testing):
npm run preview


---

## Future Improvements

- Backend integration (REST / GraphQL)
- Multi-tenant architecture
- Authentication with JWT
- Real-time sync
- Unit and integration tests
- i18n support
- UI component system extraction

---

# 🇧🇷 Versão em Português

## Visão Geral

Offline Asset Checklist PWA é um projeto de portfólio que simula um sistema operacional de checklist com:

- Arquitetura offline-first
- Controle de acesso por perfil
- Persistência local via IndexedDB
- Versionamento de schema
- Importação e exportação de dados
- Dashboard administrativo com filtros e métricas

O projeto foi estruturado para se comportar como um produto SaaS real, mesmo sem backend.

---

## Por que este projeto existe

Este projeto foi desenvolvido como parte de uma transição estratégica para a área de desenvolvimento.

O objetivo não foi criar apenas um CRUD simples, mas sim demonstrar:

- Pensamento arquitetural
- Tipagem forte com TypeScript
- Separação entre domínio e interface
- Manipulação real de dados offline
- Estrutura escalável e organizada

Ele representa uma evolução de projetos acadêmicos para engenharia orientada a produto.

---

## Principais Funcionalidades

- 🔐 Controle de acesso (Admin / Operator)
- 📱 Persistência offline
- 💾 IndexedDB com Dexie
- 📊 Dashboard administrativo com filtros
- 📤 Exportação em JSON e CSV
- 📥 Importação com deduplicação
- 📋 Templates dinâmicos por tipo de ativo
- 🧠 Lógica de detecção de problemas centralizada

---

## Stack Tecnológica

- React
- TypeScript
- Vite
- Dexie (IndexedDB)
- PWA (Service Worker)

---

## Próximas Melhorias

- Integração com backend
- Autenticação real
- Sincronização online/offline
- Testes automatizados
- Internacionalização

---
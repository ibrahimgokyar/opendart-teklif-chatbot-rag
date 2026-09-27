# Opendart Teklif Chatbotu - RTX A5000 RAG Mimarisi

## Önerilen yaklaşım

Bu proje için önerilen yapı **Advanced Conversational RAG** mimarisidir.

- Conversational: Son 8 mesajı kullanarak takip sorularını anlamlandırır.
- Hybrid retrieval: BGE-M3 vektör araması ile PostgreSQL full-text/BM25 sonuçlarını birleştirir.
- Metadata filtering: Yalnız `namespace=opendart-teklif`, yayın durumu, dil ve doküman türü uygun içerikleri getirir.
- Reranking: İlk 8 adayı bir reranker ile sıralayıp en iyi 4 parçayı modele gönderir.
- Confidence gate: Kanıt zayıfsa fiyat veya teslim taahhüdü üretmez; teklif formuna yönlendirir.
- Citations: Yanıtla birlikte kullanılan kaynakların başlık ve URL bilgilerini döndürür.

## Trafik akışı

```text
Pure JavaScript sayfası
        |
        | HTTPS POST
        v
n8n /webhook/web-site-teklif-chat
        |
        | X-API-Key ile sunucudan sunucuya
        v
RTX A5000 RAG API /api/v1/chat
        |
        +-- Sorgu yeniden yazma / niyet
        +-- BGE-M3 embedding
        +-- pgvector + full-text hibrit arama
        +-- BGE reranker
        +-- Ollama üzerindeki üretim modeli
        +-- Kaynak ve güven kontrolü
        v
n8n JSON yanıtı -> Pure JavaScript chatbot
```

## RTX A5000 makinesinde önerilen bileşenler

| Bileşen | Öneri |
|---|---|
| API | FastAPI veya Spring Boot |
| LLM sunucusu | Ollama |
| Üretim modeli | `qwen3:8b` veya donanıma göre daha büyük quantized model |
| Embedding | `bge-m3` |
| Reranker | BGE reranker ailesinden çok dilli bir model |
| Veritabanı | PostgreSQL 17 + pgvector |
| Metin araması | PostgreSQL full-text search; ihtiyaç büyürse OpenSearch |
| Reverse proxy | IIS ARR, Nginx veya Caddy üzerinden HTTPS |
| Kimlik doğrulama | `X-API-Key`, IP allowlist ve rate limit |

## Bilgi tabanı koleksiyonları

1. Opendart hizmetleri ve teknoloji yetkinlikleri
2. Kurumsal web sitesi geliştirme süreci
3. E-ticaret sitesi kapsamı
4. Eğitim platformu kapsamı
5. Mobil uygulama geliştirme kapsamı
6. Teslim aşamaları ve müşteriden istenen bilgiler
7. Onaylı referans projeler ve bağlantılar
8. Sık sorulan sorular
9. Onaylı fiyatlandırma ilkeleri - kesin fiyat değil
10. KVKK, iletişim ve destek politikası

## Chunk ve metadata önerisi

- Chunk: 450-700 token
- Örtüşme: 80-120 token
- Başlıklar korunmalı; tablo ve listeler anlamlı bloklar halinde ayrılmalı.
- Metadata: `document_id`, `title`, `url`, `category`, `language`, `version`, `published_at`, `is_active`, `namespace`, `access_level`.
- Eski sürümler indeks dışına alınmalı; silinmek yerine pasif işaretlenebilir.

## RAG API sözleşmesi

### İstek

```json
{
  "query": "Kurumsal web sitesi süreci nasıl ilerler?",
  "session_id": "tarayicida-uretilen-rastgele-id",
  "history": [{"role":"user","content":"..."}],
  "locale": "tr-TR",
  "namespace": "opendart-teklif",
  "top_k": 8,
  "rerank_top_k": 4,
  "min_score": 0.58,
  "include_sources": true
}
```

### Yanıt

```json
{
  "answer": "Proje önce ihtiyaç analiziyle başlar...",
  "sources": [
    {"title":"Kurumsal Web Sitesi Süreci","url":"https://...","score":0.87}
  ],
  "confidence": 0.84,
  "handoff": false,
  "suggested_questions": ["Teklif için hangi bilgiler gerekli?"]
}
```

## Güvenlik

- RAG sunucusunun API anahtarı `app.js` içine yazılmaz.
- RAG API mümkünse yalnız n8n Cloud çıkışından veya VPN/reverse proxy üzerinden erişilebilir olmalıdır.
- `X-API-Key` n8n Credential içinde saklanmalıdır.
- TLS/HTTPS zorunlu olmalıdır; doğrudan açık IP ve HTTP kullanılmamalıdır.
- Kullanıcı girdisi 1000 karakterle; geçmiş 8 mesajla sınırlandırılmıştır.
- Prompt injection kaynak metni talimat olarak çalıştırılmamalıdır.
- Düşük güven durumunda sistem cevap uydurmak yerine insan desteğine yönlendirmelidir.

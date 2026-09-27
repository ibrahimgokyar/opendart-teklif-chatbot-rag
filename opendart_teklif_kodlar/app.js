const teklifFormu = document.getElementById("teklifFormu");
const gonderButonu = document.getElementById("gonderButonu");
const sonucMesaji = document.getElementById("sonucMesaji");

/*
 * =========================================================
 * WEBHOOK ADRESLERİ
 * =========================================================
 */

// Teklif formu mevcut Techcareer n8n workflow'una gider.
const teklifWebhookUrl =
    "https://techcareer-n8n.app.n8n.cloud/webhook/web-site-teklif";

// Chatbot yeni Opendart n8n + RTX A5000 RAG workflow'una gider.
const chatWebhookUrl =
    "https://n8n.opendartakademi.com/webhook/web-site-teklif-chat";


/*
 * =========================================================
 * TEKLİF FORMU
 * =========================================================
 */

teklifFormu.addEventListener("submit", async function (event) {

    event.preventDefault();

    sonucMesaji.className = "sonuc-mesaji";
    sonucMesaji.textContent = "";

    gonderButonu.disabled = true;
    gonderButonu.textContent = "Gönderiliyor...";

    const teklifBilgileri = {

        ad: document.getElementById("ad").value.trim(),

        soyad: document.getElementById("soyad").value.trim(),

        email: document.getElementById("email").value.trim(),

        websiteAdi: document.getElementById("websiteAdi").value.trim(),

        websiteTuru: document.getElementById("websiteTuru").value,

        aciklama: document.getElementById("aciklama").value.trim(),

        kvkkOnay: document.getElementById("kvkkOnay").checked,

        // Güncel frontend domainimiz
        kaynak: "opendart-teklif.opendartakademi.com",

        talepTarihi: new Date().toISOString()
    };

    try {

        const response = await fetch(teklifWebhookUrl, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(teklifBilgileri)
        });


        if (!response.ok) {

            throw new Error(
                `İstek başarısız. HTTP kodu: ${response.status}`
            );
        }


        sonucMesaji.className =
            "sonuc-mesaji basarili";

        sonucMesaji.textContent =
            "Teklif talebiniz alınmıştır. En kısa sürede sizinle iletişime geçeceğiz.";

        teklifFormu.reset();


    } catch (hata) {

        console.error(
            "Teklif webhook hatası:",
            hata
        );

        sonucMesaji.className =
            "sonuc-mesaji hatali";

        sonucMesaji.textContent =
            "Talebiniz gönderilemedi. Lütfen daha sonra yeniden deneyiniz.";

    } finally {

        gonderButonu.disabled = false;

        gonderButonu.textContent =
            "Teklif Talebi Gönder";
    }
});


/*
 * =========================================================
 * CHATBOT
 * =========================================================
 */

const chatFormu =
    document.getElementById("chatFormu");

const chatInput =
    document.getElementById("chatInput");

const chatGonderButonu =
    document.getElementById("chatGonderButonu");

const chatMesajlari =
    document.getElementById("chatMesajlari");

const hizliSorular =
    document.querySelectorAll(".hizli-soru");

const chatGecmisi = [];


/*
 * Her tarayıcı sekmesi için bir session id oluşturuyoruz.
 * Böylece Spring Boot tarafındaki konuşmalar birbirinden ayrılabilir.
 */

const sessionId =
    sessionStorage.getItem("teklifChatSessionId") ||
    (
        window.crypto?.randomUUID?.() ??
        `session-${Date.now()}-${Math.random()
            .toString(16)
            .slice(2)}`
    );

sessionStorage.setItem(
    "teklifChatSessionId",
    sessionId
);


/*
 * =========================================================
 * MESAJI CHAT EKRANINA EKLE
 * =========================================================
 */

function mesajEkle(
    metin,
    tur,
    ekSinif = ""
) {

    const mesaj =
        document.createElement("div");

    mesaj.className =
        `mesaj ${
            tur === "user"
                ? "kullanici-mesaji"
                : "asistan-mesaji"
        } ${ekSinif}`.trim();

    // Güvenlik için innerHTML kullanmıyoruz.
    mesaj.textContent = metin;

    chatMesajlari.appendChild(mesaj);

    chatMesajlari.scrollTop =
        chatMesajlari.scrollHeight;

    return mesaj;
}


/*
 * =========================================================
 * RAG CEVABINI AL
 * =========================================================
 */

function yanitMetniniAl(data) {

    if (typeof data === "string") {
        return data;
    }

    return (
        data?.answer ||
        data?.output ||
        data?.text ||
        "Şu anda yanıt oluşturamadım. Teklif formunu doldurarak ekibimize ulaşabilirsiniz."
    );
}


/*
 * =========================================================
 * RAG KAYNAKLARINI GÖSTER
 * =========================================================
 */

function kaynaklariEkle(sources) {

    if (
        !Array.isArray(sources) ||
        sources.length === 0
    ) {
        return;
    }


    const kutu =
        document.createElement("div");

    kutu.className =
        "chat-kaynaklari";


    const baslik =
        document.createElement("strong");

    baslik.textContent =
        "Kaynaklar";

    kutu.appendChild(baslik);


    sources
        .slice(0, 5)
        .forEach(function (source) {

            if (
                !source ||
                !source.title
            ) {
                return;
            }


            const satir =
                document.createElement("div");

            const url =
                String(source.url || "");


            /*
             * Yalnızca HTTPS kaynak bağlantılarını
             * tıklanabilir yapıyoruz.
             */

            if (
                url.startsWith("https://")
            ) {

                const link =
                    document.createElement("a");

                link.href = url;

                link.target =
                    "_blank";

                link.rel =
                    "noopener noreferrer";

                link.textContent =
                    source.title;

                satir.appendChild(link);

            } else {

                satir.textContent =
                    source.title;
            }


            kutu.appendChild(satir);
        });


    chatMesajlari.appendChild(kutu);

    chatMesajlari.scrollTop =
        chatMesajlari.scrollHeight;
}


/*
 * =========================================================
 * RAG'IN ÖNERDİĞİ SORULAR
 * =========================================================
 */

function onerilenSorulariGuncelle(
    sorular
) {

    if (
        !Array.isArray(sorular) ||
        sorular.length === 0
    ) {
        return;
    }


    const soruAlani =
        document.querySelector(
            ".hizli-sorular"
        );


    soruAlani.replaceChildren();


    sorular
        .slice(0, 3)
        .forEach(function (soru) {

            const buton =
                document.createElement(
                    "button"
                );

            buton.type =
                "button";

            buton.className =
                "hizli-soru";

            buton.textContent =
                String(soru)
                    .slice(0, 100);


            buton.addEventListener(
                "click",
                function () {

                    chatMesajiGonder(
                        buton.textContent
                    );
                }
            );


            soruAlani.appendChild(
                buton
            );
        });
}


/*
 * =========================================================
 * CHAT MESAJINI N8N'E GÖNDER
 * =========================================================
 */

async function chatMesajiGonder(
    metin
) {

    const temizMesaj =
        metin.trim();


    if (
        !temizMesaj ||
        chatGonderButonu.disabled
    ) {
        return;
    }


    /*
     * Kullanıcı mesajını ekrana ve
     * konuşma geçmişine ekle.
     */

    mesajEkle(
        temizMesaj,
        "user"
    );


    chatGecmisi.push({
        role: "user",
        content: temizMesaj
    });


    chatInput.value = "";

    chatGonderButonu.disabled =
        true;

    chatInput.disabled =
        true;


    const yaziyor =
        mesajEkle(
            "Yanıt hazırlanıyor...",
            "assistant",
            "yaziyor-mesaji"
        );


    try {

        /*
         * Tarayıcı doğrudan Spring Boot'a gitmiyor.
         *
         * Browser
         *    ↓
         * n8n
         *    ↓
         * Spring Boot RAG
         *    ↓
         * BGE-M3 + pgvector + Qwen3
         */

        const response =
            await fetch(
                chatWebhookUrl,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        /*
                         * n8n bu message alanını
                         * Spring Boot RAG'ın
                         * query alanına çevirecek.
                         */

                        message:
                            temizMesaj,

                        sessionId:
                            sessionId,

                        /*
                         * Son 8 mesajı gönderiyoruz.
                         */

                        history:
                            chatGecmisi.slice(-8),

                        page:
                            "teklif",

                        locale:
                            "tr-TR",

                        sentAt:
                            new Date()
                                .toISOString()
                    })
                }
            );


        if (!response.ok) {

            throw new Error(
                `Chat isteği başarısız. HTTP kodu: ${response.status}`
            );
        }


        /*
         * Response gövdesini önce text olarak okuyoruz.
         * Böylece n8n 200 dönüp boş body gönderirse
         * response.json() nedeniyle uygulama çökmüyor.
         */
        const contentType =
            response.headers.get(
                "content-type"
            ) || "";

        const responseText =
            await response.text();

        console.log(
            "Chatbot HTTP response:",
            {
                status: response.status,
                contentType: contentType,
                body: responseText
            }
        );

        if (!responseText.trim()) {
            throw new Error(
                "Chatbot webhook boş response döndürdü."
            );
        }

        let data;

        if (
            contentType.includes(
                "application/json"
            )
        ) {
            try {
                data = JSON.parse(responseText);
            } catch (jsonHatasi) {
                console.error(
                    "Chatbot JSON parse hatası. Ham response:",
                    responseText
                );
                throw new Error(
                    "Chatbot webhook geçersiz JSON döndürdü."
                );
            }
        } else {
            try {
                data = JSON.parse(responseText);
            } catch {
                data = responseText;
            }
        }

        /*
         * HTTP Request node'u cevabı body altında
         * döndürürse frontend tarafında normalize ediyoruz.
         */
        if (
            data &&
            typeof data === "object" &&
            data.body &&
            typeof data.body === "object"
        ) {
            data = data.body;
        }


        /*
         * RAG cevabını al.
         */

        const cevap =
            yanitMetniniAl(data);


        yaziyor.remove();


        mesajEkle(
            cevap,
            "assistant"
        );


        /*
         * RAG kaynakları
         */

        if (
            typeof data === "object" &&
            data !== null
        ) {

            kaynaklariEkle(
                data.sources
            );


            onerilenSorulariGuncelle(
                data.suggestedQuestions ||
                data.suggested_questions
            );
        }


        /*
         * Asistan cevabını da
         * geçmişe ekliyoruz.
         */

        chatGecmisi.push({

            role:
                "assistant",

            content:
                cevap
        });


        /*
         * Tarayıcı tarafında da
         * maksimum 8 mesaj tutalım.
         */

        if (
            chatGecmisi.length > 8
        ) {

            chatGecmisi.splice(
                0,
                chatGecmisi.length - 8
            );
        }


    } catch (hata) {

        console.error(
            "Chatbot webhook hatası:",
            hata
        );


        yaziyor.remove();


        mesajEkle(
            "Şu anda bağlantı kuramıyorum. Lütfen biraz sonra tekrar deneyin veya teklif formunu kullanın.",
            "assistant",
            "hata-mesaji"
        );


    } finally {

        chatGonderButonu.disabled =
            false;

        chatInput.disabled =
            false;

        chatInput.focus();
    }
}


/*
 * =========================================================
 * CHAT FORM SUBMIT
 * =========================================================
 */

chatFormu.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();

        chatMesajiGonder(
            chatInput.value
        );
    }
);


/*
 * ENTER = GÖNDER
 * SHIFT + ENTER = YENİ SATIR
 */

chatInput.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            chatFormu.requestSubmit();
        }
    }
);


/*
 * =========================================================
 * BAŞLANGIÇTAKİ HIZLI SORULAR
 * =========================================================
 */

hizliSorular.forEach(
    function (buton) {

        buton.addEventListener(
            "click",
            function () {

                chatMesajiGonder(
                    buton.dataset.question ||
                    buton.textContent
                );
            }
        );
    }
);
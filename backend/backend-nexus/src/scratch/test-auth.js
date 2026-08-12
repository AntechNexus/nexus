require("dotenv").config();
const http = require("http");
const mongoose = require("mongoose");
                                                                                         
// Pastikan model di-load oleh Mongoose
const User = require("../models/User");
const Otp = require("../models/Otp");

// Import server (ini akan menyalakan server di port 5000)
require("../app");

// Helper untuk HTTP Request native Node.js (tanpa dependensi eksternal)
/**
 * Low-level, dependency-free HTTP request utility tailored for integration testing.
 * 
 * This function acts as a lightweight alternative to libraries like `axios` or `fetch`, leveraging Node.js's native
 * `http` module. It is designed to interact directly with the locally running Express application instance on port 5000.
 * By constructing raw HTTP streams, it ensures tests are tightly controlled and independent of third-party request logic.
 * 
 * Request Construction Workflow:
 * 1. Stringifies the `body` parameter into JSON format (if provided).
 * 2. Assembles the HTTP options, pointing to `localhost:5000` with the specified `method` and `path`.
 * 3. Injects the `Content-Type: application/json` header by default.
 * 4. Conditionally injects the `Authorization: Bearer <token>` header if a JWT token is passed, enabling tests for protected routes.
 * 5. Calculates and sets the `Content-Length` header if a body is present.
 * 6. Instantiates the HTTP request via `http.request`.
 * 
 * Response Handling Workflow:
 * 1. Attaches a callback to the request to stream the incoming response data chunks into a single string buffer.
 * 2. On the `end` event, it attempts to parse the accumulated string buffer as JSON.
 * 3. Resolves the parent promise with an object containing the HTTP `status` code and the parsed JSON `body`.
 * 4. If JSON parsing fails (e.g., the server returns plain text or HTML on 404/500 errors), it gracefully falls back to resolving the promise with the raw string body.
 * 
 * Error Handling:
 * - Listens for socket or network errors on the request object and rejects the promise.
 * 
 * @param {string} method - The standard HTTP verb to execute (e.g., "GET", "POST", "PUT", "DELETE").
 * @param {string} path - The URL endpoint relative to localhost:5000 (e.g., "/api/auth/register").
 * @param {Object|null} [body=null] - A JavaScript object containing the request payload. It will be automatically stringified to JSON.
 * @param {string|null} [token=null] - An optional JWT string. If provided, it will be injected into the Authorization header.
 * @returns {Promise<{status: number, body: any}>} Resolves with a standardized response object containing the numeric HTTP status code and the response payload (either a parsed JSON object or a raw string).
 */
function apiRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : "";
    const options = {
      hostname: "localhost",
      port: 5000,
      path: path,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

    if (body) {
      options.headers["Content-Length"] = Buffer.byteLength(postData);
    }

    const req = http.request(options, /**
     * Stream processor for the native Node.js HTTP response.
     * 
     * This internal callback is executed when the server begins responding to the custom HTTP request.
     * Since Node's HTTP module operates on streams, this function is responsible for buffering those data chunks
     * over time and finally assembling them into a complete response payload when the transmission ends.
     * 
     * Workflow:
     * 1. Initializes an empty string `data`.
     * 2. Listens for the `data` event, appending each incoming buffer chunk to the `data` string.
     * 3. Listens for the `end` event, signaling transmission completion.
     * 4. Attempts `JSON.parse()` on the full data string. Resolves the outer Promise with the parsed object on success, or the raw string on failure.
     * 
     * @param {http.IncomingMessage} res - The readable stream object representing the HTTP response from the server, containing status codes and headers.
     * @returns {void} Executes purely via event listeners; results are passed via the outer Promise's `resolve` function.
     */
    (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(data),
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: data,
          });
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (body) {
      req.write(postData);
    }
    req.end();
  });
}

// Fungsi utama test
/**
 * Orchestrator function executing a sequential, end-to-end integration test suite for the Authentication domain.
 * 
 * This monolithic function simulates a complete user lifecycle—from registration to profile editing—verifying that
 * the database models, Express routes, middleware, and business logic interact correctly. It runs against the live
 * database and API, acting as a true integration test rather than isolated unit tests.
 * 
 * Detailed Execution Flow:
 * 1. **Initialization**: Pauses execution for 3 seconds to allow the Mongoose connection inside `app.js` to establish.
 * 2. **State Reset (Cleanup)**: Purges any existing `User` and `Otp` documents matching the test email to ensure a clean slate, preventing unique constraint violations.
 * 3. **TEST 1 (Registration)**: Sends a POST to `/api/auth/register`. Asserts a 200 OK status.
 * 4. **TEST 1.5 (Database Validation)**: Queries the database directly to confirm an OTP document was correctly generated and linked to the email.
 * 5. **TEST 2 (Rate Limiting/Cooldown)**: Immediately attempts to request a new OTP via `/api/auth/resend-otp`. Asserts a 400 Bad Request status, verifying that the 60-second anti-spam cooldown logic is functioning.
 * 6. **TEST 3 (OTP Verification & Onboarding)**: Sends the database-retrieved OTP code along with onboarding survey data to `/api/auth/verify-otp`. Asserts a 200 OK status. Queries the database again to ensure `user.isVerified` flipped to true.
 * 7. **TEST 4 (Login & JWT Generation)**: Submits credentials to `/api/auth/login` with `rememberMe` flag. Asserts a 200 OK status and extracts the JWT `token` from the response body.
 * 8. **TEST 5 (Protected Route Access)**: Uses the extracted JWT to request the `/api/auth/me` endpoint. Asserts a 200 OK status, confirming the JWT middleware correctly parses the token and allows access.
 * 9. **TEST 5.1 & 5.2 (Profile Validation)**: Tests the PUT `/api/auth/profile` endpoint. First with valid data (asserting 200 OK), then with invalid, too-short data (asserting 400 Bad Request to verify validation logic).
 * 10. **Final Cleanup & Teardown**: Deletes the test user and OTP documents from the database. Logs success and exits the process with code 0.
 * 11. **Error Handling**: If any assertion fails or an unexpected exception occurs anywhere in the chain, it catches the error, logs a failure message with the stack trace, and terminates with an exit code of 1.
 * 
 * @returns {Promise<void>} Resolves successfully when the entire test sequence passes.
 * @throws {Error} Throws manually constructed Error objects if any HTTP status assertion fails, which triggers the catch block and fails the test suite.
 */
async function runTests() {
  console.log("Menunggu 3 detik agar database MongoDB terhubung...");
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const testEmail = "testuser@example.com";
  const testPassword = "Password123!";

  console.log("\n=================== STARTING INTEGRATION TESTS ===================");

  try {
    // 0. Bersihkan test data lama jika ada
    await User.deleteMany({ email: testEmail });
    await Otp.deleteMany({ email: testEmail });
    console.log("✓ Database dibersihkan untuk email pengujian");

    // 1. Uji Coba Register/Signup (Dengan Email, Password, Nama)
    console.log("\n[TEST 1] Registering User...");
    const regRes = await apiRequest("POST", "/api/auth/register", {
      email: testEmail,
      password: testPassword,
      fullName: "Ria Kristi",
    });
    console.log("Response Status:", regRes.status);
    console.log("Response Body:", regRes.body);
    if (regRes.status !== 200) throw new Error("Registrasi gagal");

    // 2. Cek OTP terbuat di DB
    const otpRecord = await Otp.findOne({ email: testEmail });
    if (!otpRecord) throw new Error("OTP tidak berhasil dibuat di database");
    console.log("✓ OTP ditemukan di Database:", otpRecord.code);

    // 3. Uji Coba Cooldown Resend OTP (Harus Gagal / status 400)
    console.log("\n[TEST 2] Resend OTP segera setelah register (harus kena cooldown 60s)...");
    const resendRes = await apiRequest("POST", "/api/auth/resend-otp", {
      email: testEmail,
    });
    console.log("Response Status (Expected 400):", resendRes.status);
    console.log("Response Body:", resendRes.body);
    if (resendRes.status !== 400) throw new Error("Harusnya kena cooldown 400");
    console.log("✓ Cooldown 60 detik terverifikasi bekerja dengan baik!");

    // 4. Uji Coba Verifikasi OTP + Pengisian Onboarding
    console.log("\n[TEST 3] Verifying OTP and submitting Onboarding Survey...");
    const verifyRes = await apiRequest("POST", "/api/auth/verify-otp", {
      email: testEmail,
      code: otpRecord.code,
      onboarding: {
        role: "Data Analyst",
        teamSize: "1-5",
        primaryGoal: "Build a portfolio and get my first job"
      }
    });
    console.log("Response Status:", verifyRes.status);
    console.log("Response Body:", verifyRes.body);
    if (verifyRes.status !== 200) throw new Error("Verifikasi OTP gagal");

    // Cek status user di DB
    const verifiedUser = await User.findOne({ email: testEmail });
    if (!verifiedUser || !verifiedUser.isVerified) throw new Error("User belum terverifikasi di DB");
    console.log("✓ Status user terverifikasi di DB");

     // 5. Uji Coba Login
     console.log("\n[TEST 4] Logging in (dengan rememberMe: true untuk session 7 hari)...");
     const loginRes = await apiRequest("POST", "/api/auth/login", {
       email: testEmail,
       password: testPassword,
       rememberMe: true,
     });
     console.log("Response Status:", loginRes.status);
     console.log("Response Body:", loginRes.body);
     if (loginRes.status !== 200 || !loginRes.body.token) throw new Error("Login gagal");
     const token = loginRes.body.token;
     console.log("✓ Token JWT didapatkan");

    // 6. Uji Coba Proteksi Endpoint /me
    console.log("\n[TEST 5] Accessing protected /me profile route...");
    const meRes = await apiRequest("GET", "/api/auth/me", null, token);
    console.log("Response Status:", meRes.status);
    console.log("Response Body:", meRes.body);
    if (meRes.status !== 200) throw new Error("Gagal mengakses endpoint terproteksi /me");
    console.log("✓ Detail profil user berhasil diakses via JWT!");

    // 6.5. Uji Coba Edit Profile (NEX-089)
    console.log("\n[TEST 5.1] Updating user profile with valid name (Ria Kristi Basri)...");
    const updateRes = await apiRequest("PUT", "/api/auth/profile", {
      fullName: "Ria Kristi Basri",
      roleTitle: "Data Analyst"
    }, token);
    console.log("Response Status:", updateRes.status);
    console.log("Response Body:", updateRes.body);
    if (updateRes.status !== 200) throw new Error("Gagal mengupdate profil");

    console.log("\n[TEST 5.2] Updating user profile with invalid short name (1 character)...");
    const updateShortRes = await apiRequest("PUT", "/api/auth/profile", {
      fullName: "R"
    }, token);
    console.log("Response Status (Expected 400):", updateShortRes.status);
    console.log("Response Body:", updateShortRes.body);
    if (updateShortRes.status !== 400) throw new Error("Update profil dengan nama pendek harusnya gagal");
    console.log("✓ Validasi panjang nama 2-50 karakter terbukti bekerja!");

    // 7. Cleanup
    console.log("\n[TEST 6] Cleaning up test user...");
    await User.deleteOne({ email: testEmail });
    await Otp.deleteMany({ email: testEmail });
    console.log("✓ Data test dibersihkan");

    console.log("\n===============================================================");
    console.log("ALL TESTS COMPLETED SUCCESSFULLY! \u2705");
    console.log("===============================================================");
    process.exit(0);
  } catch (error) {
    console.error("\nTEST FAILED! \u274C");
    console.error(error);
    process.exit(1);
  }
}

runTests();

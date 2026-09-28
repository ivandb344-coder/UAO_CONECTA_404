#!/usr/bin/env python3
"""
Backend testing for UAO Conecta - File Storage Migration to GridFS
Tests file upload, storage, authorization, and various content types.
"""
import requests
import json
import sys
import io
from typing import Dict, Optional

# Base URL from supervisor config
BASE_URL = "https://7858e35c-28d7-4180-865b-f1b403446e93.preview.emergentagent.com/api"

# Test results tracking
test_results = []
failed_tests = []

def log_test(name: str, passed: bool, details: str = ""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = f"{status}: {name}"
    if details:
        result += f" - {details}"
    test_results.append(result)
    if not passed:
        failed_tests.append({"name": name, "details": details})
    print(result)

def test_backend_service():
    """Test 1: Backend service running"""
    print("\n=== TEST 1: Backend Service ===")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "message" in data and "UAO Conecta" in data["message"]:
                log_test("Backend service running", True, f"Status: {response.status_code}")
                return True
            else:
                log_test("Backend service running", False, f"Unexpected response: {data}")
                return False
        else:
            log_test("Backend service running", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        log_test("Backend service running", False, f"Error: {str(e)}")
        return False

def get_demo_tokens():
    """Get demo user tokens"""
    print("\n=== Getting Demo Tokens ===")
    
    # Get student token
    try:
        response = requests.post(f"{BASE_URL}/auth/demo", timeout=10)
        if response.status_code == 200:
            data = response.json()
            student_token = data["token"]
            student_user = data["user"]
            print(f"✓ Student token obtained: {student_user.get('name')} (ID: {student_user.get('id')})")
        else:
            print(f"✗ Failed to get student token: {response.status_code}")
            return None, None
    except Exception as e:
        print(f"✗ Error getting student token: {str(e)}")
        return None, None
    
    # Get monitor token (will be used as "other user" for authorization tests)
    try:
        response = requests.post(f"{BASE_URL}/auth/demo-advisor", timeout=10)
        if response.status_code == 200:
            data = response.json()
            monitor_token = data["token"]
            monitor_user = data["user"]
            print(f"✓ Monitor token obtained: {monitor_user.get('name')} (ID: {monitor_user.get('id')})")
        else:
            print(f"✗ Failed to get monitor token: {response.status_code}")
            return student_token, None
    except Exception as e:
        print(f"✗ Error getting monitor token: {str(e)}")
        return student_token, None
    
    return student_token, monitor_token

def create_test_subject(token: str):
    """Create a test subject for resource testing"""
    headers = {"Authorization": f"Bearer {token}"}
    subject_data = {
        "name": "Test Subject for Files",
        "code": f"TSTFILE{hash('test')%10000}",
        "description": "Subject for testing file resources",
        "program": "Ingeniería Informática",
        "semester": 3,
        "schedule": "Test schedule",
        "color": "blue"
    }
    try:
        response = requests.post(f"{BASE_URL}/subjects", json=subject_data, headers=headers, timeout=10)
        if response.status_code == 200:
            subject = response.json()
            print(f"✓ Created test subject: {subject.get('name')} (ID: {subject.get('id')})")
            return subject
        else:
            print(f"✗ Failed to create subject: {response.status_code}")
            return None
    except Exception as e:
        print(f"✗ Error creating subject: {str(e)}")
        return None

def test_file_upload_various_types(token: str):
    """Test 2: Upload files with various content types"""
    print("\n=== TEST 2: File Upload - Various Content Types ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    uploaded_files = []
    
    # Test cases: (filename, content, content_type)
    test_files = [
        ("document.pdf", b"%PDF-1.4\n%Test PDF content", "application/pdf"),
        ("document.docx", b"PK\x03\x04Mock Word content", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        ("presentation.pptx", b"PK\x03\x04Mock PowerPoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
        ("spreadsheet.xlsx", b"PK\x03\x04Mock Excel content", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        ("image.png", b"\x89PNG\r\n\x1a\nMock PNG", "image/png"),
        ("image.jpg", b"\xff\xd8\xff\xe0Mock JPEG", "image/jpeg"),
        ("archive.zip", b"PK\x03\x04Mock ZIP archive", "application/zip"),
        ("video.mp4", b"\x00\x00\x00\x18ftypMock MP4", "video/mp4"),
        ("assignment.txt", b"This is a test assignment file", "text/plain"),
        ("resource.md", b"# Test Resource\nMarkdown content", "text/markdown"),
    ]
    
    for filename, content, content_type in test_files:
        try:
            files = {"file": (filename, io.BytesIO(content), content_type)}
            response = requests.post(f"{BASE_URL}/files", files=files, headers=headers, timeout=10)
            if response.status_code == 200:
                file_data = response.json()
                uploaded_files.append(file_data)
                log_test(f"Upload {filename}", True, f"Path: {file_data.get('storage_path')}, Type: {content_type}")
            else:
                log_test(f"Upload {filename}", False, f"Status: {response.status_code}, Body: {response.text[:200]}")
        except Exception as e:
            log_test(f"Upload {filename}", False, f"Error: {str(e)}")
    
    return uploaded_files

def test_profile_photo_upload(token: str):
    """Test 3: Profile photo upload (uses same GridFS flow)"""
    print("\n=== TEST 3: Profile Photo Upload ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a small test image
    image_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    
    try:
        files = {"file": ("profile.png", io.BytesIO(image_content), "image/png")}
        response = requests.post(f"{BASE_URL}/profile/photo", files=files, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            picture_url = data.get("picture")
            log_test("Profile photo upload", True, f"Picture URL: {picture_url}")
            return picture_url
        else:
            log_test("Profile photo upload", False, f"Status: {response.status_code}, Body: {response.text[:200]}")
            return None
    except Exception as e:
        log_test("Profile photo upload", False, f"Error: {str(e)}")
        return None

def test_file_download_and_metadata(token: str, file_data: dict, expected_content: bytes):
    """Test 4: Download file and verify Content-Type, Content-Disposition, and bytes"""
    print("\n=== TEST 4: File Download & Metadata ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    storage_path = file_data.get("storage_path")
    filename = file_data.get("name")
    
    if not storage_path:
        log_test("File download - missing storage_path", False, "No storage path in file data")
        return
    
    try:
        response = requests.get(f"{BASE_URL}/files/{storage_path}", headers=headers, timeout=10)
        if response.status_code == 200:
            # Check Content-Type
            content_type = response.headers.get("Content-Type")
            if content_type:
                log_test(f"Download {filename} - Content-Type", True, f"Type: {content_type}")
            else:
                log_test(f"Download {filename} - Content-Type", False, "Missing Content-Type header")
            
            # Check Content-Disposition
            content_disposition = response.headers.get("Content-Disposition")
            if content_disposition and "filename=" in content_disposition:
                log_test(f"Download {filename} - Content-Disposition", True, f"Disposition: {content_disposition}")
            else:
                log_test(f"Download {filename} - Content-Disposition", False, f"Missing or invalid: {content_disposition}")
            
            # Verify bytes
            if response.content == expected_content:
                log_test(f"Download {filename} - Content verification", True, f"Size: {len(response.content)} bytes")
            else:
                log_test(f"Download {filename} - Content verification", False, f"Content mismatch. Expected {len(expected_content)}, got {len(response.content)}")
        else:
            log_test(f"Download {filename}", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test(f"Download {filename}", False, f"Error: {str(e)}")

def test_authorization_unauthenticated(storage_path: str):
    """Test 5: Unauthenticated access returns 401"""
    print("\n=== TEST 5: Authorization - Unauthenticated ===")
    
    try:
        response = requests.get(f"{BASE_URL}/files/{storage_path}", timeout=10)
        if response.status_code == 401:
            log_test("Unauthenticated access returns 401", True, "Correct authorization check")
        else:
            log_test("Unauthenticated access returns 401", False, f"Expected 401, got {response.status_code}")
    except Exception as e:
        log_test("Unauthenticated access returns 401", False, f"Error: {str(e)}")

def test_authorization_non_owner(owner_token: str, other_token: str, storage_path: str):
    """Test 6: Non-owner without resource/task/chat access returns 403"""
    print("\n=== TEST 6: Authorization - Non-owner Without Reference ===")
    
    headers = {"Authorization": f"Bearer {other_token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/files/{storage_path}", headers=headers, timeout=10)
        if response.status_code == 403:
            log_test("Non-owner without reference gets 403", True, "Correct authorization check")
        else:
            log_test("Non-owner without reference gets 403", False, f"Expected 403, got {response.status_code}")
    except Exception as e:
        log_test("Non-owner without reference gets 403", False, f"Error: {str(e)}")

def test_authorization_owner(token: str, storage_path: str):
    """Test 7: Owner can access file (returns 200)"""
    print("\n=== TEST 7: Authorization - Owner Access ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/files/{storage_path}", headers=headers, timeout=10)
        if response.status_code == 200:
            log_test("Owner can access file", True, f"Status: {response.status_code}")
        else:
            log_test("Owner can access file", False, f"Expected 200, got {response.status_code}")
    except Exception as e:
        log_test("Owner can access file", False, f"Error: {str(e)}")

def test_resource_publishing_and_access(owner_token: str, other_token: str, subject_id: str):
    """Test 8: Publish resource and verify non-owner can access via resource"""
    print("\n=== TEST 8: Resource Publishing & Access ===")
    
    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    other_headers = {"Authorization": f"Bearer {other_token}"}
    
    # Owner uploads a file for the resource
    file_content = b"This is a resource document for the subject"
    try:
        files = {"file": ("resource_doc.pdf", io.BytesIO(file_content), "application/pdf")}
        upload_response = requests.post(f"{BASE_URL}/files", files=files, headers=owner_headers, timeout=10)
        if upload_response.status_code == 200:
            file_data = upload_response.json()
            print(f"✓ Owner uploaded resource file: {file_data.get('name')}")
        else:
            log_test("Upload resource file", False, f"Status: {upload_response.status_code}")
            return
    except Exception as e:
        log_test("Upload resource file", False, f"Error: {str(e)}")
        return
    
    # First, other user joins the subject
    try:
        # Get subject access code
        response = requests.get(f"{BASE_URL}/subjects", headers=owner_headers, timeout=10)
        if response.status_code == 200:
            subjects = response.json()
            subject = next((s for s in subjects if s.get("id") == subject_id), None)
            if subject and "access_code" in subject:
                # Other user joins
                join_response = requests.post(f"{BASE_URL}/subjects/join", 
                                            json={"code": subject["access_code"]}, 
                                            headers=other_headers, timeout=10)
                if join_response.status_code == 200:
                    print(f"✓ Other user joined subject")
                else:
                    print(f"✗ Failed to join subject: {join_response.status_code}")
    except Exception as e:
        print(f"✗ Error joining subject: {str(e)}")
    
    # Publish resource
    resource_data = {
        "kind": "file",
        "title": "Test Resource Document",
        "description": "A test resource for file access",
        "storage_path": file_data.get("storage_path"),
        "url": "",
        "file_name": file_data.get("name")
    }
    
    try:
        response = requests.post(f"{BASE_URL}/subjects/{subject_id}/resources", 
                                json=resource_data, headers=owner_headers, timeout=10)
        if response.status_code == 200:
            resource = response.json()
            log_test("Publish resource with file", True, f"Resource ID: {resource.get('id')}")
            
            # Now test that other user can access the file via resource
            storage_path = file_data.get("storage_path")
            try:
                file_response = requests.get(f"{BASE_URL}/files/{storage_path}", 
                                            headers=other_headers, timeout=10)
                if file_response.status_code == 200:
                    log_test("Non-owner can access file via resource", True, "Authorization via resource works")
                else:
                    log_test("Non-owner can access file via resource", False, f"Expected 200, got {file_response.status_code}")
            except Exception as e:
                log_test("Non-owner can access file via resource", False, f"Error: {str(e)}")
        else:
            log_test("Publish resource with file", False, f"Status: {response.status_code}, Body: {response.text[:200]}")
    except Exception as e:
        log_test("Publish resource with file", False, f"Error: {str(e)}")

def test_task_submission_file_access(professor_token: str, student_token: str, subject_id: str):
    """Test 9: Task submission file access authorization"""
    print("\n=== TEST 9: Task Submission File Access ===")
    
    professor_headers = {"Authorization": f"Bearer {professor_token}"}
    student_headers = {"Authorization": f"Bearer {student_token}"}
    
    # Professor creates a task
    task_data = {
        "title": "Test Assignment",
        "description": "Submit a file for testing",
        "due_date": "2026-12-31",
        "due_time": "23:59",
        "materials": []
    }
    
    try:
        response = requests.post(f"{BASE_URL}/subjects/{subject_id}/tasks", 
                                json=task_data, headers=professor_headers, timeout=10)
        if response.status_code == 200:
            task = response.json()
            task_id = task.get("id")
            print(f"✓ Created task: {task.get('title')}")
            
            # Student uploads a file
            file_content = b"This is my assignment submission"
            files = {"file": ("assignment.txt", io.BytesIO(file_content), "text/plain")}
            upload_response = requests.post(f"{BASE_URL}/files", files=files, 
                                          headers=student_headers, timeout=10)
            if upload_response.status_code == 200:
                file_data = upload_response.json()
                file_id = file_data.get("id")
                storage_path = file_data.get("storage_path")
                print(f"✓ Student uploaded file: {file_data.get('name')}")
                
                # Student submits the task with the file
                submission_data = {
                    "text": "Here is my submission",
                    "link": "",
                    "file_id": file_id
                }
                submit_response = requests.post(f"{BASE_URL}/tasks/{task_id}/submissions", 
                                              json=submission_data, headers=student_headers, timeout=10)
                if submit_response.status_code == 200:
                    log_test("Student submits task with file", True, "Submission created")
                    
                    # Test that professor can access the student's submission file
                    try:
                        file_response = requests.get(f"{BASE_URL}/files/{storage_path}", 
                                                    headers=professor_headers, timeout=10)
                        if file_response.status_code == 200:
                            log_test("Professor can access student submission file", True, "Authorization via task works")
                        else:
                            log_test("Professor can access student submission file", False, f"Expected 200, got {file_response.status_code}")
                    except Exception as e:
                        log_test("Professor can access student submission file", False, f"Error: {str(e)}")
                else:
                    log_test("Student submits task with file", False, f"Status: {submit_response.status_code}")
            else:
                print(f"✗ Failed to upload file: {upload_response.status_code}")
        else:
            print(f"✗ Failed to create task: {response.status_code}")
    except Exception as e:
        print(f"✗ Error in task submission test: {str(e)}")

def main():
    """Run all backend file storage tests"""
    print("=" * 80)
    print("UAO CONECTA - FILE STORAGE MIGRATION TO GRIDFS - BACKEND TESTING")
    print("=" * 80)
    
    # Test 1: Backend service
    if not test_backend_service():
        print("\n❌ Backend service is not running. Cannot proceed with tests.")
        sys.exit(1)
    
    # Get authentication tokens
    student_token, monitor_token = get_demo_tokens()
    if not student_token or not monitor_token:
        print("\n❌ Failed to obtain authentication tokens. Cannot proceed.")
        sys.exit(1)
    
    # Create test subject for resource testing
    subject = create_test_subject(monitor_token)
    subject_id = subject.get("id") if subject else None
    
    # Test 2: Upload various file types
    uploaded_files = test_file_upload_various_types(student_token)
    
    # Test 3: Profile photo upload
    profile_photo_url = test_profile_photo_upload(student_token)
    
    # Test 4: Download and verify metadata for first uploaded file
    if uploaded_files:
        first_file = uploaded_files[0]
        test_file_content = b"%PDF-1.4\n%Test PDF content"
        test_file_download_and_metadata(student_token, first_file, test_file_content)
        
        # Test 5: Unauthenticated access
        test_authorization_unauthenticated(first_file.get("storage_path"))
        
        # Test 6: Non-owner without reference (use monitor as non-owner)
        test_authorization_non_owner(student_token, monitor_token, first_file.get("storage_path"))
        
        # Test 7: Owner access
        test_authorization_owner(student_token, first_file.get("storage_path"))
        
        # Test 8: Resource publishing and access
        if subject_id:
            test_resource_publishing_and_access(monitor_token, student_token, subject_id)
    
    # Test 9: Task submission file access
    if subject_id:
        test_task_submission_file_access(monitor_token, student_token, subject_id)
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    total = len(test_results)
    passed = total - len(failed_tests)
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {len(failed_tests)}")
    
    if failed_tests:
        print("\n❌ FAILED TESTS:")
        for test in failed_tests:
            print(f"  - {test['name']}: {test['details']}")
    else:
        print("\n✅ ALL TESTS PASSED!")
    
    print("\n" + "=" * 80)
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())

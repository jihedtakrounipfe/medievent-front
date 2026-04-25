import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type EventAudience = 'DOCTORS_ONLY' | 'PUBLIC';
export type EventStatus   = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
export type ParticipantRole = 'PARTICIPANT' | 'GUEST';
export type ParticipantStatus = 'CONFIRMED' | 'PENDING_INVITE' | 'DECLINED' | 'WAITING_LIST';

export interface Participant {
  id?: number;
  userId: number;
  userName: string;
  userEmail: string;
  role: ParticipantRole;
  status: ParticipantStatus;
}

export interface MedicalEvent {
  id?: number;
  title: string;
  description: string;
  eventDate: string;
  location: string;
  targetAudience: EventAudience;
  specialization?: string;
  speakerName?: string;
  speakerBio?: string;
  agenda?: string;
  bannerUrl?: string;
  status?: EventStatus;
  organizerId?: number;
  organizerName?: string;
  organizerEmail?: string;
  rejectionReason?: string;
  maxParticipants?: number;
  confirmedCount?: number;
  waitingListCount?: number;
  finalParticipantCount?: number;
  speakers?: {
    id: number;
    fullName: string;
    email: string;
    specialization?: string;
    profilePicture?: string;
  }[];
}

export interface MyParticipation {
  event: MedicalEvent;
  status: ParticipantStatus;
  waitingListPosition?: number;
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/api/v1`;

  // Public
  getActiveEvents(): Observable<MedicalEvent[]> {
    return this.http.get<MedicalEvent[]>(`${this.API}/events/active`);
  }

  getEventById(id: number): Observable<MedicalEvent> {
    return this.http.get<MedicalEvent>(`${this.API}/events/${id}`);
  }

  // Doctor
  createEvent(event: MedicalEvent): Observable<MedicalEvent> {
    return this.http.post<MedicalEvent>(`${this.API}/doctor/events`, event);
  }

  updateEvent(id: number, event: MedicalEvent): Observable<MedicalEvent> {
    return this.http.put<MedicalEvent>(`${this.API}/doctor/events/${id}`, event);
  }

  getMyEvents(): Observable<MedicalEvent[]> {
    return this.http.get<MedicalEvent[]>(`${this.API}/doctor/events/my`);
  }

  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/doctor/events/${id}`);
  }

  deleteEventForAdmin(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/admin/events/${id}`);
  }

  // Admin
  getAllEventsForAdmin(): Observable<MedicalEvent[]> {
    return this.http.get<MedicalEvent[]>(`${this.API}/admin/events`);
  }

  getPendingEvents(): Observable<MedicalEvent[]> {
    return this.http.get<MedicalEvent[]>(`${this.API}/admin/events/pending`);
  }

  approveEvent(id: number): Observable<MedicalEvent> {
    return this.http.post<MedicalEvent>(`${this.API}/admin/events/${id}/approve`, {});
  }

  rejectEvent(id: number, reason: string): Observable<MedicalEvent> {
    return this.http.post<MedicalEvent>(`${this.API}/admin/events/${id}/reject`, reason);
  }

  // Participation
  joinEvent(eventId: number): Observable<Participant> {
    return this.http.post<Participant>(`${this.API}/events/participation/${eventId}/join`, {});
  }

  inviteUser(eventId: number, userId: number): Observable<Participant> {
    return this.http.post<Participant>(`${this.API}/events/participation/${eventId}/invite/${userId}`, {});
  }

  inviteGuestByEmail(eventId: number, guestEmail: string, guestName: string): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.API}/events/participation/${eventId}/invite-email`, { guestEmail, guestName });
  }

  respondToInvite(eventId: number, accept: boolean): Observable<Participant> {
    return this.http.post<Participant>(`${this.API}/events/participation/${eventId}/respond?accept=${accept}`, {});
  }

  getEventParticipants(eventId: number): Observable<Participant[]> {
    return this.http.get<Participant[]>(`${this.API}/events/participation/${eventId}/participants`);
  }

  getMyInvitations(): Observable<MedicalEvent[]> {
    return this.http.get<MedicalEvent[]>(`${this.API}/events/participation/invitations/my`);
  }

  getMyParticipations(): Observable<MyParticipation[]> {
    return this.http.get<MyParticipation[]>(`${this.API}/events/participation/participations/my`);
  }

  cancelParticipation(eventId: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/events/participation/${eventId}/cancel`);
  }

  addSpeaker(eventId: number, doctorId: number): Observable<MedicalEvent> {
    return this.http.post<MedicalEvent>(`${this.API}/doctor/events/${eventId}/speakers/${doctorId}`, {});
  }

  completeEvent(eventId: number, participantCount?: number): Observable<any> {
    let params = {};
    if (participantCount !== undefined) {
      params = { participantCount: participantCount.toString() };
    }
    return this.http.post(`${this.API}/doctor/events/${eventId}/complete`, {}, { 
      params, 
      responseType: 'text' as 'json' 
    });
  }

  // ─── Signaling (WebRTC) ──────────────────────────────────────────────────
  private readonly STREAM_API = `${environment.apiUrl}/api/v1/stream`;

  registerHost(eventId: string, peerId: string): Observable<void> {
    return this.http.post<void>(`${this.STREAM_API}/${eventId}/register`, { peerId }, { responseType: 'text' as 'json' });
  }

  getSpectators(eventId: string): Observable<{ spectators: string[] }> {
    return this.http.get<{ spectators: string[] }>(`${this.STREAM_API}/${eventId}/spectators`);
  }

  getSignal(eventId: string): Observable<{ isLive: boolean, hosts: string[] }> {
    return this.http.get<{ isLive: boolean, hosts: string[] }>(`${this.STREAM_API}/${eventId}/signal`);
  }

  unregisterHost(eventId: string, peerId: string): Observable<void> {
    return this.http.delete<void>(`${this.STREAM_API}/${eventId}/register/${peerId}`, { responseType: 'text' as 'json' });
  }

  registerSpectator(eventId: string, peerId: string): Observable<{ registered: boolean, hostIsLive: boolean }> {
    return this.http.post<{ registered: boolean, hostIsLive: boolean }>(`${this.STREAM_API}/${eventId}/spectator`, { peerId });
  }

  unregisterSpectator(eventId: string, peerId: string): Observable<void> {
    return this.http.delete<void>(`${this.STREAM_API}/${eventId}/spectator/${peerId}`, { responseType: 'text' as 'json' });
  }

  // Hand Raise Moderation
  requestToSpeak(eventId: string, peerId: string, name: string): Observable<any> {
    return this.http.post(`${this.STREAM_API}/${eventId}/hand-raise`, { peerId, name });
  }

  getPendingHandRaises(eventId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.STREAM_API}/${eventId}/hand-raises`);
  }

  handleHandRaise(eventId: string, peerId: string, action: 'ACCEPT' | 'REJECT'): Observable<any> {
    return this.http.post(`${this.STREAM_API}/${eventId}/hand-raise/action`, { peerId, action });
  }

  // User Search
  searchDoctors(query: string): Observable<any> {
    return this.http.get<any>(`${this.API}/users/search?name=${query}&userType=DOCTOR&size=5`);
  }
}

import React from 'react';
import { FaceScanner } from '../FaceScanner';

const FaceIcon = ({ size = "1em", ...props }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M9 11.75c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75zm6 0c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-2.5c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z"/>
    </svg>
);

export const WelcomeView = ({ handleBiometricScan, token, uuid, balloonData, glowColor, biometricResult, progress, setView, buttonLabel = "🔍 Localizar meu Cadastro", instruction = "Aproxime seu rosto da câmera para entrar" }) => (
    <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s', position: 'relative' }}>
        <h2 style={{ fontSize: 'clamp(1.8rem, 4vh, 2.5rem)', color: '#333', marginBottom: 'clamp(1rem, 3vh, 3rem)' }}>Seja Bem-vindo(a)!</h2>

        <div className="moving-border-wrapper moving-border-green" style={{
            width: 'min(462px, 62vh)',
            height: 'min(462px, 62vh)',
            borderRadius: '35px',
            margin: '0 auto clamp(1.5rem, 4vh, 4rem)'
        }}>
            <div style={{
                width: '100%', height: '100%', borderRadius: '30px', overflow: 'hidden',
                backgroundColor: '#ffffff', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <FaceScanner
                    onScanSuccess={handleBiometricScan}
                    isRegistration={false}
                    token={token}
                    eventId={uuid}
                    followerBalloon={balloonData}
                    glowColor={glowColor}
                />
            </div>
        </div>

        {biometricResult && biometricResult.type !== 'already_in' && (
            <div style={{
                position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                width: '85%', backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '1.2rem',
                borderRadius: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', textAlign: 'center',
                animation: 'slideUp 0.3s ease-out', zIndex: 100, border: '2px solid #00995D', backdropFilter: 'blur(5px)'
            }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', backgroundColor: '#eee', borderRadius: '15px 15px 0 0', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#00995D', transition: 'width 0.05s linear' }} />
                </div>
                <div style={{ color: biometricResult.type === 'error' ? '#dc3545' : '#00995D', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.3rem', fontWeight: 'bold' }}>
                    {biometricResult.type === 'success' ? 'Sucesso' : (biometricResult.type === 'error' ? 'Aviso' : 'Informativo')}
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#333' }}>
                    {biometricResult.type === 'error' ? 'Não Identificado' : biometricResult.user.nome}
                </div>
                <div style={{ color: biometricResult.type === 'error' ? '#dc3545' : '#00995D', fontSize: '1rem', marginTop: '0.2rem', fontWeight: '500' }}>
                    {biometricResult.type === 'success' ? 'Entrada Confirmada! ✅' : 
                     (biometricResult.type === 'error' ? (biometricResult.message || 'Rosto não reconhecido') : (biometricResult.user.nome + ' já registrado! ✅'))}
                </div>
            </div>
        )}

        <p style={{ fontSize: 'clamp(1rem, 2.5vh, 1.2rem)', color: '#666', marginBottom: 'clamp(1rem, 4vh, 3rem)', fontWeight: 'bold' }}>
            {instruction}
        </p>

        <button
            onClick={() => setView('search')}
            style={{
                padding: '1.2rem 3rem', fontSize: '1.3rem', backgroundColor: '#00995D', color: 'white',
                border: 'none', borderRadius: '50px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,153,93,0.3)',
                transition: 'transform 0.2s', fontWeight: 'bold'
            }}
        >
            {buttonLabel}
        </button>
    </div>
);

export const SearchView = ({ setView, searchTerm, handleSearch, searchResults, handleSelectParticipant, maskCPF, searchInputRef }) => (
    <div style={{ width: '100%', maxWidth: '800px', animation: 'slideUp 0.3s', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button
            onClick={() => setView('welcome')}
            style={{
                padding: '1rem 2.5rem', backgroundColor: 'var(--basic-gray-100)', border: 'none', borderRadius: '10px',
                fontSize: '1.4rem', cursor: 'pointer', marginBottom: '2rem', display: 'flex', alignItems: 'center',
                gap: '0.5rem', color: 'var(--basic-gray-700)', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
            }}
        >
            ⬅ Voltar
        </button>

        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#333' }}>Buscar Participante</h2>

        <input
            ref={searchInputRef}
            type="text"
            placeholder="Digite seu Nome, CPF ou CRM..."
            value={searchTerm}
            onChange={e => handleSearch(e.target.value)}
            style={{
                width: '100%', padding: '1.5rem', fontSize: '1.5rem', borderRadius: '12px',
                border: '2px solid #ddd', marginBottom: '2rem', boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
            }}
        />

        {searchResults.length > 0 ? (
            <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', maxHeight: '50vh', overflowY: 'auto' }}>
                {searchResults.map(p => (
                    <div
                        key={p.id}
                        onClick={() => handleSelectParticipant(p)}
                        style={{
                            backgroundColor: 'white', padding: '1.5rem', borderRadius: '10px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)', cursor: 'pointer', border: '1px solid #eee',
                            transition: 'transform 0.1s', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.4rem' }}>{p.nome}</div>
                            <div style={{ color: '#666', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span>CPF: {maskCPF(p.cpf)}</span>
                                {p.crm && <span style={{ color: '#2c3e50', fontWeight: '500' }}>CRM: {p.crm}</span>}
                                {p.especialidade && <span style={{ color: '#004E4C', fontSize: '0.85rem', fontStyle: 'italic' }}>{p.especialidade}</span>}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            {p.template_biometrico && !p.template_biometrico.startsWith('manual_') ? (
                                <span title="Face Cadastrada" style={{ color: '#00995D', display: 'flex' }}><FaceIcon size="2rem" /></span>
                            ) : (
                                <span title="Sem Biometria" style={{ color: '#666', opacity: 0.3, filter: 'grayscale(100%)', display: 'flex' }}><FaceIcon size="2rem" /></span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            searchTerm.length > 2 && <p style={{ textAlign: 'center', color: '#666', fontSize: '1.2rem' }}>Nenhum resultado encontrado.</p>
        )}
    </div>
);

export const ConfirmView = ({ selectedParticipant, maskCPF, handleBiometricScan, token, isVerifying, errorMsg, setView, handleConfirmCheckin, skipLabel = "Pular Biometria" }) => (
    <div style={{ textAlign: 'center', animation: 'fadeIn 0.3s', backgroundColor: 'white', padding: 'clamp(1.5rem, 4vh, 3rem)', borderRadius: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '100%', width: '100%', maxWidth: '700px' }}>
        <div style={{ fontSize: 'clamp(2rem, 4vh, 3rem)', marginBottom: '0.5rem' }}>👤</div>
        <h2 style={{ fontSize: 'clamp(1.5rem, 3vh, 1.8rem)', marginBottom: '0.5rem' }}>Confirmar Identidade</h2>
        
        <div style={{ fontSize: 'clamp(1.4rem, 2.5vh, 1.8rem)', fontWeight: 'bold', color: '#00995D', marginBottom: '0.5rem' }}>
            {selectedParticipant.nome}
        </div>
        <div style={{ fontSize: '1.2rem', color: '#555', marginBottom: 'clamp(1rem, 2vh, 1.5rem)' }}>
            CPF: {maskCPF(selectedParticipant.cpf)}
        </div>

        <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '16px', border: '1px solid var(--basic-gray-100)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <div style={{ width: '100%', maxWidth: '400px', borderRadius: '12px', overflow: 'hidden', border: '3px solid #00995D' }}>
                <FaceScanner onScanSuccess={handleBiometricScan} isRegistration={true} token={token} />
            </div>
            <p style={{ color: '#666', fontSize: '1.1rem', marginTop: '1rem', fontWeight: 'bold' }}>
                {isVerifying ? 'Salvando...' : 'Aproxime o rosto e clique no botão circular'}
            </p>
            {errorMsg && (
                <p style={{ color: '#dc3545', fontWeight: 'bold', animation: 'shake 0.5s', padding: '0.5rem', backgroundColor: '#fff5f5', borderRadius: '8px', border: '1px solid #feb2b2' }}>
                    ⚠️ {errorMsg}
                </p>
            )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: 'auto' }}>
            <button onClick={() => setView('search')} style={{ padding: '1rem 2rem', fontSize: '1.1rem', backgroundColor: '#e9ecef', color: 'var(--basic-gray-700)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                Cancelar
            </button>
            <button onClick={handleConfirmCheckin} style={{ padding: '1rem 2rem', fontSize: '1.1rem', backgroundColor: 'var(--basic-gray-500)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '500' }}>
                {skipLabel}
            </button>
        </div>
    </div>
);

export const SuccessView = ({ scannedUser, statusMessage }) => (
    <div style={{ 
        textAlign: 'center', animation: 'popIn 0.5s', width: '100%', maxWidth: '800px', padding: '3rem 2rem',
        borderRadius: '30px', backgroundColor: 'rgba(0, 153, 93, 0.5)', color: 'white', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        border: '4px solid white', backdropFilter: 'blur(10px)'
    }}>
        <div style={{
            width: '240px', height: '240px', margin: '0 auto 1.5rem', borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', border: '8px solid white', overflow: 'hidden'
        }}>
            {scannedUser?.foto_biometria ? (
                <img src={scannedUser.foto_biometria} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
                <div style={{ fontSize: '8rem' }}>✅</div>
            )}
        </div>
        <h2 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
            {scannedUser?.genero === 'F' ? 'Bem-vinda' : (scannedUser?.genero === 'M' ? 'Bem-vindo' : 'Bem-vindo(a)')},
        </h2>
        <h1 style={{ fontSize: '3rem', margin: '0 0 0.5rem 0', lineHeight: '1.2' }}>
            {scannedUser?.nome || 'Participante'}
        </h1>
        {scannedUser?.crm && (
            <div style={{ fontSize: '1.8rem', marginBottom: '1.5rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.9)' }}>
                CRM: {scannedUser.crm}
            </div>
        )}
        <div style={{ fontSize: '1.8rem', fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.2)', padding: '1rem 2rem', borderRadius: '50px', display: 'inline-block' }}>
            Tenha um bom evento!
        </div>
    </div>
);

export const ErrorView = ({ statusMessage }) => (
    <div style={{ textAlign: 'center', animation: 'shake 0.5s' }}>
        <div style={{ fontSize: '6rem', color: '#dc3545', marginBottom: '1rem' }}>🚫</div>
        <h2 style={{ fontSize: '2.5rem', color: '#dc3545', marginBottom: '1rem' }}>Atenção</h2>
        <p style={{ fontSize: '1.5rem', color: '#333' }}>{statusMessage || 'Erro ao processar'}</p>
    </div>
);

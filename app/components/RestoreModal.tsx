'use client'

import { useState, useRef } from 'react'
import { X, Upload, AlertTriangle, CheckCircle, AlertCircle, FileText } from 'lucide-react'

type RestoreMode = 'dry-run' | 'create-only' | 'overwrite'

interface DryRunResult {
    mode: 'dry-run'
    totalLines: number
    validRecords: number
    parseErrorsCount: number
    invalidRecordsCount: number
    invalidSamples: Array<{ line: number; error: string }>
    duplicateIdsCount: number
    duplicateSamples: string[]
    wouldCreateCount: number
    wouldSkipCount: number
    wouldOverwriteCount: number
    conflicts: string[]
    targetPrefix: string
}

interface RestoreResult {
    mode: 'create-only' | 'overwrite'
    totalLines: number
    validRecords: number
    createdCount: number
    skippedCount: number
    overwrittenCount: number
    errorCount: number
    errors: Array<{ id: string; error: string }>
    targetPrefix: string
}

type Result = DryRunResult | RestoreResult | null

interface RestoreModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function RestoreModal({ isOpen, onClose }: RestoreModalProps) {
    const [file, setFile] = useState<File | null>(null)
    const [mode, setMode] = useState<RestoreMode>('dry-run')
    const [useSandbox, setUseSandbox] = useState(false)
    const [confirmText, setConfirmText] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<Result>(null)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    if (!isOpen) return null

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0]
        if (selected) {
            setFile(selected)
            setResult(null)
            setError(null)
        }
    }

    const handleSubmit = async () => {
        if (!file) return

        setLoading(true)
        setResult(null)
        setError(null)

        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('mode', mode)
            formData.append('targetPrefixMode', useSandbox ? 'restore-sandbox' : 'default')

            if (mode === 'overwrite') {
                formData.append('confirmOverwrite', 'true')
                formData.append('confirmText', confirmText)
            }

            const res = await fetch('/api/backup/restore', {
                method: 'POST',
                body: formData,
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Restore failed')
                return
            }

            setResult(data)
        } catch (err) {
            setError('Failed to connect to server')
            console.error('Restore error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setFile(null)
        setMode('dry-run')
        setUseSandbox(false)
        setConfirmText('')
        setResult(null)
        setError(null)
        onClose()
    }

    const canSubmit = file && !loading && (mode !== 'overwrite' || confirmText === 'OVERWRITE')

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">Restaurar Backup</h2>
                    <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* File picker */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Arquivo NDJSON
                        </label>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition"
                        >
                            {file ? (
                                <div className="flex items-center justify-center gap-2 text-gray-700">
                                    <FileText size={20} />
                                    <span>{file.name}</span>
                                    <span className="text-gray-500 text-sm">
                                        ({(file.size / 1024).toFixed(1)} KB)
                                    </span>
                                </div>
                            ) : (
                                <div className="text-gray-500">
                                    <Upload size={24} className="mx-auto mb-2" />
                                    <p>Clique para selecionar arquivo .ndjson</p>
                                </div>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".ndjson"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>

                    {/* Mode selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Modo de Restauração
                        </label>
                        <div className="space-y-2">
                            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                <input
                                    type="radio"
                                    name="mode"
                                    value="dry-run"
                                    checked={mode === 'dry-run'}
                                    onChange={() => setMode('dry-run')}
                                    className="mt-1"
                                />
                                <div>
                                    <div className="font-medium">Dry Run (Prévia)</div>
                                    <div className="text-sm text-gray-500">
                                        Analisa o arquivo sem fazer alterações. Mostra o que seria criado/atualizado.
                                    </div>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                <input
                                    type="radio"
                                    name="mode"
                                    value="create-only"
                                    checked={mode === 'create-only'}
                                    onChange={() => setMode('create-only')}
                                    className="mt-1"
                                />
                                <div>
                                    <div className="font-medium">Criar Apenas</div>
                                    <div className="text-sm text-gray-500">
                                        Importa apenas registros novos. Reservas existentes não são modificadas.
                                    </div>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 p-3 border border-red-200 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100">
                                <input
                                    type="radio"
                                    name="mode"
                                    value="overwrite"
                                    checked={mode === 'overwrite'}
                                    onChange={() => setMode('overwrite')}
                                    className="mt-1"
                                />
                                <div>
                                    <div className="font-medium text-red-700 flex items-center gap-2">
                                        <AlertTriangle size={16} />
                                        Sobrescrever (PERIGO)
                                    </div>
                                    <div className="text-sm text-red-600">
                                        Sobrescreve reservas existentes. Use apenas se tiver certeza!
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Overwrite confirmation */}
                    {mode === 'overwrite' && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                                <AlertTriangle size={18} />
                                Confirmação Obrigatória
                            </div>
                            <p className="text-sm text-red-600 mb-3">
                                Digite <strong>OVERWRITE</strong> para confirmar que deseja sobrescrever registros existentes.
                            </p>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="Digite OVERWRITE"
                                className="w-full px-3 py-2 border border-red-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                    )}

                    {/* Sandbox option */}
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                            type="checkbox"
                            checked={useSandbox}
                            onChange={(e) => setUseSandbox(e.target.checked)}
                        />
                        <div>
                            <div className="font-medium">Usar Sandbox</div>
                            <div className="text-sm text-gray-500">
                                Restaura em uma pasta de teste, sem afetar dados de produção.
                            </div>
                        </div>
                    </label>

                    {/* Error display */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                            <div className="text-red-700">{error}</div>
                        </div>
                    )}

                    {/* Results display */}
                    {result && (
                        <div className={`border rounded-lg p-4 ${result.mode === 'dry-run'
                                ? 'bg-blue-50 border-blue-200'
                                : (result as RestoreResult).errorCount > 0
                                    ? 'bg-yellow-50 border-yellow-200'
                                    : 'bg-green-50 border-green-200'
                            }`}>
                            <div className="flex items-center gap-2 font-medium mb-3">
                                {result.mode === 'dry-run' ? (
                                    <>
                                        <FileText className="text-blue-600" size={20} />
                                        <span className="text-blue-700">Resultado da Prévia</span>
                                    </>
                                ) : (result as RestoreResult).errorCount > 0 ? (
                                    <>
                                        <AlertTriangle className="text-yellow-600" size={20} />
                                        <span className="text-yellow-700">Restauração Parcial</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="text-green-600" size={20} />
                                        <span className="text-green-700">Restauração Concluída</span>
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>Total de linhas:</div>
                                <div className="font-medium">{result.totalLines}</div>

                                <div>Registros válidos:</div>
                                <div className="font-medium">{result.validRecords}</div>

                                {result.mode === 'dry-run' && (
                                    <>
                                        <div>Seriam criados:</div>
                                        <div className="font-medium text-green-600">{result.wouldCreateCount}</div>

                                        <div>Seriam sobrescritos:</div>
                                        <div className="font-medium text-orange-600">{result.wouldOverwriteCount}</div>

                                        {result.parseErrorsCount > 0 && (
                                            <>
                                                <div>Erros de parse:</div>
                                                <div className="font-medium text-red-600">{result.parseErrorsCount}</div>
                                            </>
                                        )}

                                        {result.duplicateIdsCount > 0 && (
                                            <>
                                                <div>IDs duplicados:</div>
                                                <div className="font-medium text-orange-600">{result.duplicateIdsCount}</div>
                                            </>
                                        )}
                                    </>
                                )}

                                {result.mode !== 'dry-run' && (
                                    <>
                                        <div>Criados:</div>
                                        <div className="font-medium text-green-600">{(result as RestoreResult).createdCount}</div>

                                        <div>Ignorados:</div>
                                        <div className="font-medium text-gray-600">{(result as RestoreResult).skippedCount}</div>

                                        <div>Sobrescritos:</div>
                                        <div className="font-medium text-orange-600">{(result as RestoreResult).overwrittenCount}</div>

                                        {(result as RestoreResult).errorCount > 0 && (
                                            <>
                                                <div>Erros:</div>
                                                <div className="font-medium text-red-600">{(result as RestoreResult).errorCount}</div>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Conflicts list */}
                            {result.mode === 'dry-run' && result.conflicts.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-blue-200">
                                    <div className="text-sm font-medium text-blue-700 mb-1">
                                        Conflitos ({result.wouldOverwriteCount}):
                                    </div>
                                    <div className="text-xs text-blue-600 font-mono break-all">
                                        {result.conflicts.slice(0, 10).join(', ')}
                                        {result.conflicts.length > 10 && ` ... e mais ${result.conflicts.length - 10}`}
                                    </div>
                                </div>
                            )}

                            {/* Target prefix */}
                            <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                                Prefixo: <code className="bg-gray-100 px-1 rounded">{result.targetPrefix}</code>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    >
                        Fechar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className={`px-4 py-2 rounded-lg font-medium transition ${mode === 'overwrite' && confirmText === 'OVERWRITE'
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : mode === 'create-only'
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : 'bg-gray-800 hover:bg-gray-900 text-white'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {loading
                            ? 'Processando...'
                            : mode === 'dry-run'
                                ? 'Analisar'
                                : mode === 'create-only'
                                    ? 'Importar Novos'
                                    : 'Sobrescrever'}
                    </button>
                </div>
            </div>
        </div>
    )
}

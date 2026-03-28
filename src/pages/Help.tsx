import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  Phone, 
  Mail, 
  HelpCircle, 
  Search, 
  BookOpen, 
  Video, 
  FileText, 
  Users,
  ArrowLeftRight,
  ShoppingCart,
  KeyRound,
  UserCog,
  Trophy,
  ChevronRight,
  Headphones,
  Send,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useBanner } from '@/contexts/BannerContext';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface SupportCategory {
  id: string;
  icon: React.ElementType;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  color: string;
}

interface FAQ {
  id: string;
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
  category: string;
}

const supportCategories: SupportCategory[] = [
  {
    id: 'transfers',
    icon: ArrowLeftRight,
    titleEn: 'Transfers',
    titleAr: 'التحويلات',
    descriptionEn: 'Nova transfer issues, delays, failures, receipts',
    descriptionAr: 'مشاكل تحويل Nova، التأخير، الفشل، الإيصالات',
    color: 'bg-blue-500/10 text-blue-500',
  },
  {
    id: 'people',
    icon: Users,
    titleEn: 'People',
    titleAr: 'الأشخاص',
    descriptionEn: 'User search, chat issues, block/report',
    descriptionAr: 'البحث عن مستخدم، مشاكل المحادثات، حظر/إبلاغ',
    color: 'bg-purple-500/10 text-purple-500',
  },
  {
    id: 'shopping',
    icon: ShoppingCart,
    titleEn: 'Shopping',
    titleAr: 'التسوق',
    descriptionEn: 'Orders, payments, refunds, delivery',
    descriptionAr: 'الطلبات، الدفع، الاسترداد، التوصيل',
    color: 'bg-green-500/10 text-green-500',
  },
  {
    id: 'security',
    icon: KeyRound,
    titleEn: 'Security',
    titleAr: 'الأمان',
    descriptionEn: 'Password, PIN, 2FA, account access',
    descriptionAr: 'كلمة المرور، PIN، التحقق بخطوتين، الوصول للحساب',
    color: 'bg-red-500/10 text-red-500',
  },
  {
    id: 'account',
    icon: UserCog,
    titleEn: 'Account',
    titleAr: 'الحساب',
    descriptionEn: 'Profile, settings, verification, limits',
    descriptionAr: 'الملف الشخصي، الإعدادات، التحقق، الحدود',
    color: 'bg-orange-500/10 text-orange-500',
  },
  {
    id: 'contests',
    icon: Trophy,
    titleEn: 'Contests',
    titleAr: 'المسابقات',
    descriptionEn: 'Participation, voting, prizes, winners',
    descriptionAr: 'المشاركة، التصويت، الجوائز، الفائزون',
    color: 'bg-yellow-500/10 text-yellow-500',
  },
];

const faqs: FAQ[] = [
  {
    id: '1',
    questionEn: 'How do I transfer Nova to another user?',
    questionAr: 'كيف أحول Nova إلى مستخدم آخر؟',
    answerEn: 'Go to the Wallet tab, select "Transfer Nova", enter the recipient\'s username or QR code, amount, and confirm with your PIN.',
    answerAr: 'اذهب إلى تبويب المحفظة، اختر "تحويل Nova"، أدخل اسم المستخدم أو رمز QR للمستلم، المبلغ، وأكد برمز PIN الخاص بك.',
    category: 'transfers',
  },
  {
    id: '2',
    questionEn: 'What are the transfer limits?',
    questionAr: 'ما هي حدود التحويل؟',
    answerEn: 'Daily limit is 10,000 Nova, monthly limit is 50,000 Nova. Limits increase with verification level.',
    answerAr: 'الحد اليومي هو 10,000 Nova، الحد الشهري هو 50,000 Nova. تزداد الحدود مع مستوى التحقق.',
    category: 'transfers',
  },
  {
    id: '3',
    questionEn: 'How do I set up my Transaction PIN?',
    questionAr: 'كيف أقوم بإعداد رمز PIN للمعاملات؟',
    answerEn: 'Go to Settings > Security > Transaction PIN. Choose a 6-digit PIN that you\'ll use for transfers and sensitive operations.',
    answerAr: 'اذهب إلى الإعدادات > الأمان > رمز PIN للمعاملات. اختر رمز مكون من 6 أرقام ستستخدمه للتحويلات والعمليات الحساسة.',
    category: 'security',
  },
  {
    id: '4',
    questionEn: 'How do contests work?',
    questionAr: 'كيف تعمل المسابقات؟',
    answerEn: 'Join contests during the registration period, vote for participants, and win prizes based on your votes and contest results.',
    answerAr: 'انضم إلى المسابقات خلال فترة التسجيل، صوت للمشاركين، واربح جوائز بناءً على أصواتك ونتائج المسابقة.',
    category: 'contests',
  },
  {
    id: '5',
    questionEn: 'How can I contact support?',
    questionAr: 'كيف يمكنني التواصل مع الدعم؟',
    answerEn: 'Use the in-app chat, email support@nova.com, or call our hotline. Response time is usually within 24 hours.',
    answerAr: 'استخدم الدردشة داخل التطبيق، أو أرسل بريدًا إلى support@nova.com، أو اتصل بخطنا الساخن. وقت الاستجابة عادة خلال 24 ساعة.',
    category: 'general',
  },
];

export default function HelpPage() {
  const { language } = useLanguage();
  const { user } = useUser();
  const { success: showSuccess, error: showError } = useBanner();
  const navigate = useNavigate();
  const isRTL = language === 'ar' || language === 'ur' || language === 'fa';

  const [activeTab, setActiveTab] = useState<'categories' | 'faqs' | 'contact'>('categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({
    subject: '',
    category: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = searchQuery === '' || 
      faq.questionEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.questionAr.includes(searchQuery) ||
      faq.answerEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answerAr.includes(searchQuery);
    
    const matchesCategory = !selectedCategory || faq.category === selectedCategory || faq.category === 'general';
    
    return matchesSearch && matchesCategory;
  });

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactForm.subject || !contactForm.category || !contactForm.message) {
      showError(isRTL ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        title: contactForm.subject,
        category: contactForm.category,
        description: contactForm.message,
        status: 'open',
        priority: 'normal',
        user_id: user?.id,
      });

      if (error) throw error;

      showSuccess(isRTL ? 'تم إرسال طلب الدعم بنجاح' : 'Support ticket submitted successfully');
      setContactForm({ subject: '', category: '', message: '' });
      setActiveTab('categories');
    } catch (error) {
      showError(isRTL ? 'فشل إرسال طلب الدعم' : 'Failed to submit support ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const renderCategories = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <HelpCircle className="h-12 w-12 mx-auto text-blue-500" />
        <h2 className="text-2xl font-bold">
          {isRTL ? 'كيف يمكننا مساعدتك؟' : 'How can we help you?'}
        </h2>
        <p className="text-muted-foreground">
          {isRTL ? 'اختر الفئة المناسبة لمشكلتك' : 'Choose the category that best fits your issue'}
        </p>
      </div>

      <div className="grid gap-4">
        {supportCategories.map((category) => {
          const Icon = category.icon;
          return (
            <motion.div
              key={category.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${category.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">
                        {isRTL ? category.titleAr : category.titleEn}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {isRTL ? category.descriptionAr : category.descriptionEn}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="text-center space-y-4">
        <Separator />
        <div className="space-y-2">
          <h3 className="font-semibold">
            {isRTL ? 'لا تجد ما تبحث عنه؟' : "Don't find what you're looking for?"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isRTL ? 'فريق الدعم جاهز للمساعدة' : 'Our support team is ready to help'}
          </p>
        </div>
        <Button
          onClick={() => setActiveTab('contact')}
          className="bg-blue-500 hover:bg-blue-600"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          {isRTL ? 'تواصل مع الدعم' : 'Contact Support'}
        </Button>
      </div>
    </div>
  );

  const renderFAQs = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">
          {isRTL ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
        </h2>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isRTL ? 'ابحث في الأسئلة...' : 'Search FAQs...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={!selectedCategory ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            {isRTL ? 'الكل' : 'All'}
          </Button>
          {supportCategories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
            >
              {isRTL ? category.titleAr : category.titleEn}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredFAQs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <HelpCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">
                {isRTL ? 'لا توجد نتائج' : 'No results found'}
              </h3>
              <p className="text-muted-foreground">
                {isRTL ? 'جرب تغيير مصطلحات البحث أو الفئة' : 'Try different search terms or categories'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredFAQs.map((faq) => (
            <Card key={faq.id}>
              <CardContent className="p-4">
                <div
                  className="cursor-pointer"
                  onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold pr-2">
                      {isRTL ? faq.questionAr : faq.questionEn}
                    </h3>
                    <ChevronRight
                      className={`h-5 w-5 text-muted-foreground transition-transform ${
                        expandedFAQ === faq.id ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                  {expandedFAQ === faq.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 text-muted-foreground"
                    >
                      {isRTL ? faq.answerAr : faq.answerEn}
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );

  const renderContact = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Headphones className="h-12 w-12 mx-auto text-blue-500" />
        <h2 className="text-2xl font-bold">
          {isRTL ? 'تواصل مع الدعم' : 'Contact Support'}
        </h2>
        <p className="text-muted-foreground">
          {isRTL ? 'نحن هنا للمساعدة. الرد خلال 24 ساعة.' : 'We\'re here to help. Response within 24 hours.'}
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {isRTL ? 'الموضوع' : 'Subject'}
              </label>
              <Input
                placeholder={isRTL ? 'صف مشكلتك باختصار...' : 'Briefly describe your issue...'}
                value={contactForm.subject}
                onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {isRTL ? 'الفئة' : 'Category'}
              </label>
              <select
                value={contactForm.category}
                onChange={(e) => setContactForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="">
                  {isRTL ? 'اختر فئة...' : 'Select a category...'}
                </option>
                {supportCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {isRTL ? category.titleAr : category.titleEn}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {isRTL ? 'الرسالة' : 'Message'}
              </label>
              <Textarea
                placeholder={isRTL ? 'اشرح مشكلتك بالتفصيل...' : 'Explain your issue in detail...'}
                value={contactForm.message}
                onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                rows={5}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {isRTL ? 'إرسال' : 'Send'}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Mail className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <h3 className="font-semibold mb-1">
              {isRTL ? 'البريد الإلكتروني' : 'Email'}
            </h3>
            <p className="text-sm text-muted-foreground">
              support@nova.com
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Phone className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <h3 className="font-semibold mb-1">
              {isRTL ? 'الهاتف' : 'Phone'}
            </h3>
            <p className="text-sm text-muted-foreground">
              +966 50 123 4567
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <h3 className="font-semibold mb-1">
              {isRTL ? 'الدردشة الحية' : 'Live Chat'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'متاحة 9AM-9PM' : 'Available 9AM-9PM'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader title={isRTL ? 'المساعدة والدعم' : 'Help & Support'} />
      
      <main className="flex-1 px-4 py-4 pb-20">
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={activeTab === 'categories' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('categories')}
              className="flex-1"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              {isRTL ? 'الفئات' : 'Categories'}
            </Button>
            <Button
              variant={activeTab === 'faqs' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('faqs')}
              className="flex-1"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              {isRTL ? 'الأسئلة' : 'FAQs'}
            </Button>
            <Button
              variant={activeTab === 'contact' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('contact')}
              className="flex-1"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {isRTL ? 'تواصل' : 'Contact'}
            </Button>
          </div>

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'categories' && renderCategories()}
            {activeTab === 'faqs' && renderFAQs()}
            {activeTab === 'contact' && renderContact()}
          </motion.div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
